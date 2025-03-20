from datetime import datetime
from typing import List, Tuple, cast
from gvxrPython3 import gvxr
import numpy as np
import os

from webct.components.Beam import PROJECTION, Beam, LabBeam, MedBeam, SynchBeam
from webct.components.Capture import CaptureParameters
from webct.components.Detector import SCINTILLATOR_MATERIAL, DetectorParameters
from webct.components.Material import (
	CompoundMaterial,
	ElementMaterial,
	HUMaterial,
	Material,
	MixtureMaterial,
)
from webct.components.Samples import RenderedSampleSettings
from webct.components.sim.simulators.Simulator import Simulator
from webct import model_folder
from matplotlib.colors import hsv_to_rgb
from zlib import crc32

def colour_from_string(string:str) -> Tuple[float,float,float]:
	"""Deterministically Creates a rgb colour from a given string.
		The same text input will always return the same colour.

	Args:
		string (str): String to create a colour from.

	Returns:
		Tuple[float,float,float]: A series of 0.0 - 1.0 floats representing (R, G, B)
	"""
	return hsv_to_rgb((float(crc32(string.encode("utf-8")) & 0xffffffff) / 2**32, 0.75, 0.9))

class GVXRSimulator(Simulator):
	total_rotation: Tuple[float, float, float] = (0, 0, 0)
	laminography: bool = False
	"""
	X-Ray simulator implemented using gvirtualxray.
	"""

	def __init__(self, sid:str, pid:int):
		super().__init__(sid=sid, pid=pid)
		self.firstSetup = False
		os.makedirs(f"logs/{datetime.now().strftime('%Y-%m-%d')}/", exist_ok=True)
		gvxr.useLogFile(f"logs/{datetime.now().strftime('%Y-%m-%d')}/GVXR-{datetime.now().strftime('%H-%M')}-{self._sid}-{self._pid}.log")
		self._initRenderer()

	def _initRenderer(self):
		gvxr.createWindow(-1, 0, "OpenGL")
		gvxr.setWindowSize(1800, 600)

		gvxr.removePolygonMeshesFromSceneGraph()
		gvxr.disableArtefactFiltering()
		gvxr.setDetectorUpVector(0, 0, -1)

		# This specific rotation matrix assumes using CIL standards (z-)
		gvxr.setSceneRotationMatrix((-0.11599329859018326, -0.580069899559021, 0.8062660098075867, 0.0, 0.9919215440750122, -0.025721648707985878, 0.1241975873708725, 0.0, -0.05130457878112793, 0.8141602873802185, 0.578368604183197, 0.0, 0.0, 0.0, 0.0, 1.0))
		gvxr.setWindowBackGroundColour(0.94, 0.98, 1)

		gvxr.rotateNode("root", 90, 0, 1, 0)

	def SimSingleProjection(self) -> np.ndarray:
		# workaround, doesn't seem to be set properly in init
		gvxr.disableArtefactFiltering()

		# if no samples are loaded, gvxr crashes.
		# As a workaround, simulate white images if the number of samples is 0.
		# This makes it easier to deal with on the frontend.
		white = np.asarray(gvxr.getWhiteImage())
		if len(self.samples.samples) == 0:
			return white / white.max()
		else:
			return np.asarray(gvxr.computeXRayImage()) / white

	def SimAllProjections(self) -> np.ndarray:
		# workaround, doesn't seem to be set properly in init
		gvxr.disableArtefactFiltering()

		# ! bug:- does not take into account scene node scaling.
		# gvxr.computeCTAcquisition("", "", self.capture.projections, 0, False, self.capture.angles[-1], 1, 0, 0, 0, "mm", 0, 0, 1, True, 1)
		# images = np.asarray(gvxr.getLastProjectionSet())

		white = gvxr.getWhiteImage()
		im1 = np.asarray(gvxr.computeXRayImage())
		images = np.empty((self.capture.projections, *im1.shape))

		images[0] = im1
		from tqdm import trange
		for i in trange(1, self.capture.projections):
			angle = self.capture.angles[i]
			gvxr.rotateNode("root", angle, 0, 0)
			images[i] = np.asarray(gvxr.computeXRayImage())
			gvxr.rotateNode("root", -angle, 0, 0)

		return images / white

	@property
	def beam(self) -> Beam:
		return self._beam

	@beam.setter
	def beam(self, value: Beam) -> None:
		if value.params.projection == PROJECTION.POINT:
			gvxr.usePointSource()
			# Focal spot is setup in capture, as it changes beam position.
		elif value.params.projection == PROJECTION.PARALLEL:
			gvxr.useParallelBeam()
		else:
			raise NotImplementedError("Only parallel or point sources are supported.")

		# setup spectra
		gvxr.resetBeamSpectrum()
		for i in range(0, len(value.spectra.energies)):
			gvxr.addEnergyBinToSpectrum(
				value.spectra.energies[i], "keV", value.spectra.photons[i]
			)

		# setup noise
		if value.params.enableNoise and self.capture is not None:
			if isinstance(value.params, LabBeam) or isinstance(value.params, MedBeam):
				gvxr.enablePoissonNoise()
				mAs = 1
				if isinstance(value.params, LabBeam):
					lab = cast(LabBeam, value.params)
					mAs = (lab.intensity / 1000) * lab.exposure
				else:
					med = cast(MedBeam, value.params)
					mAs = med.mas

				electron_charge = 1.602e-19  # [C]
				photon_count = mAs * (1.0e-3 / electron_charge) * (1 / ((self.capture.SDD * 10) ** 2))
				gvxr.setNumberOfPhotonsPerCM2(photon_count)
			elif isinstance(value.params, SynchBeam):
				gvxr.enablePoissonNoise()
				synch = cast(SynchBeam, value.params)

				# flux is x10^10
				flux = synch.flux * synch.exposure
				gvxr.setNumberOfPhotonsPerCM2(flux * 10e10)
			else:
				gvxr.disablePoissonNoise()
		else:
			gvxr.disablePoissonNoise()

		self._beam = value

	@property
	def detector(self) -> DetectorParameters:
		return self._detector

	@detector.setter
	def detector(self, value: DetectorParameters) -> None:

		if value.enableLSF and value.lsf is not None:
			gvxr.setLSF(value.binned_lsf)
		else:
			gvxr.clearLSF()

		# set detector shape
		gvxr.setDetectorNumberOfPixels(value.binned_shape[1], value.binned_shape[0])
		gvxr.setDetectorPixelSize(value.binned_pixel_size, value.binned_pixel_size, "mm")


		if value.scintillator.material == SCINTILLATOR_MATERIAL.NONE:
			gvxr.clearDetectorEnergyResponse()
		elif value.scintillator.material == SCINTILLATOR_MATERIAL.CUSTOM:
			gvxr.setDetectorEnergyResponse(value.scintillator.response.asTuple, "keV")
		else:
			gvxr.setScintillator(value.scintillator.material.value, value.scintillator.thickness, "mm")

		self._detector = value

	@property
	def samples(self) -> RenderedSampleSettings:
		return self._samples

	@samples.setter
	def samples(self, value: RenderedSampleSettings) -> None:
		gvxr.removePolygonMeshesFromSceneGraph()

		if self.samples is not None:
			# revert scaling on scene node
			corrective_scale = 1 / self.samples.scaling
			gvxr.scaleScene(corrective_scale, corrective_scale, corrective_scale, "mm")

		for sample in value.samples:
			label = sample.label
			mat: Material = sample.material

			gvxr.loadMeshFile(label, f"{model_folder}{sample.modelPath}", sample.sizeUnit)

			if isinstance(mat, ElementMaterial):
				gvxr.setElement(label, mat.element)
			elif isinstance(mat, CompoundMaterial):
				gvxr.setCompound(label, mat.compound)
			elif isinstance(mat, MixtureMaterial):
				gvxr.setMixture(label, mat.atomicNumbers, mat.weights)
			elif isinstance(mat, HUMaterial):
				gvxr.setHU(label, mat.HUunit)
			else:
				raise NotImplementedError(f"Invalid MaterialType '{type(mat)}' {mat}")

			# Density has to be set after setting the mixture, otherwise gvxr crashes.
			if not isinstance(mat, HUMaterial):
				gvxr.setDensity(label, mat.density, "g/cm3")

			gvxr.setColour(label, *colour_from_string(label), 1)
			gvxr.moveToCenter(label)

		# Apply global sample properties
		gvxr.scaleScene(value.scaling, value.scaling, value.scaling, "mm")
		self._samples = value

	@property
	def capture(self) -> CaptureParameters:
		return self._capture

	@capture.setter
	def capture(self, value: CaptureParameters) -> None:
		print(value)
		gvxr.setDetectorPosition(*value.detector_position, "mm")
		gvxr.setSourcePosition(*value.beam_position, "mm")

		if self.beam.params.spotSize != 0:
			# todo: change to square source
			gvxr.setFocalSpot(*self.capture.beam_position, self.beam.params.spotSize, "mm", 3)

		# Changing detector/source position will effect if the source is in
		# parallel or point mode. We re-set the beam value to fix this.
		self.beam = self._beam

		# Tilt detector based on rotation
		from scipy.spatial.transform import Rotation as R

		default_up_rotation = R.from_euler('xyz', [0, 0, -180], degrees=True)
		rotation = R.from_euler('xyz', [value.detector_rotation], degrees=True)
		up_vector = (default_up_rotation * rotation).as_rotvec().squeeze() / np.pi

		print(F"Up Vector: {up_vector}")
		gvxr.setDetectorUpVector(*up_vector)
		gvxr.renderLoop()

		# Undo rotations in order to reset scene rotation matrix
		if self.laminography:
			gvxr.rotateScene(-1 * self.total_rotation[2], 0, 0, 1)
			gvxr.rotateScene(-1 * self.total_rotation[1], 0, 1, 0)
			gvxr.rotateScene(-1 * self.total_rotation[0], 1, 0, 0)
		else:
			gvxr.rotateNode("root", -1 * self.total_rotation[2], 0, 0, 1)
			gvxr.rotateNode("root", -1 * self.total_rotation[1], 0, 1, 0)
			gvxr.rotateNode("root", -1 * self.total_rotation[0], 1, 0, 0)

		self.laminography = value.laminography_mode
		self.total_rotation = value.sample_rotation

		if self.laminography:
			gvxr.rotateScene(value.sample_rotation[0], 1, 0, 0)
			gvxr.rotateScene(value.sample_rotation[1], 0, 1, 0)
			gvxr.rotateScene(value.sample_rotation[2], 0, 0, 1)
		else:
			gvxr.rotateNode("root", value.sample_rotation[0], 1, 0, 0)
			gvxr.rotateNode("root", value.sample_rotation[1], 0, 1, 0)
			gvxr.rotateNode("root", value.sample_rotation[2], 0, 0, 1)
		self._capture = value


	def RenderScene(self) -> Tuple[Tuple[float]]:
		gvxr.displayScene()
		# gvxr.renderLoop()

		# Zoom scene
		dist = np.asarray(gvxr.getDetectorPosition("mm")) - np.asarray(gvxr.getSourcePosition("mm"))

		zoom = (abs(dist[1]) * 0.5)
		if zoom < self.detector.pixel_size * 2000:
			zoom += (7 - np.log(zoom)) * ((self.detector.pixel_size*1000) / 2)

		gvxr.setZoom(zoom)

		# Update scene
		gvxr.displayScene()
		gvxr.takeScreenshot()
		gvxr.displayScene()

		return gvxr.takeScreenshot()

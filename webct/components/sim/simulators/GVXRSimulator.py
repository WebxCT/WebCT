from typing import List, Tuple, cast
from gvxrPython3 import gvxr
import numpy as np

from webct.components.Beam import PROJECTION, Beam, LabBeam
from webct.components.Capture import CaptureParameters
from webct.components.Detector import SCINTILLATOR_MATERIAL, DetectorParameters, EnergyResponse
from webct.components.Material import (
	CompoundMaterial,
	ElementMaterial,
	HUMaterial,
	Material,
	MixtureMaterial,
	SpecialMaterial,
	SpecialMaterialEnum,
)
from webct.components.Samples import RenderedSample
from webct.components.sim.Quality import Quality
from webct.components.sim.simulators.Simulator import Simulator
from webct import model_folder
from matplotlib.colors import hsv_to_rgb
from zlib import crc32
from tqdm import trange

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
	"""
	X-Ray simulator implemented using gvirtualxray.
	"""

	def __init__(self):
		super().__init__()
		self.firstSetup = False
		self._initRenderer()

	def _initRenderer(self):
		gvxr.createWindow(-1, 0, "OPENGL")
		gvxr.setWindowSize(1800, 600)

		gvxr.removePolygonMeshesFromSceneGraph()
		gvxr.disableArtefactFiltering()
		gvxr.setDetectorUpVector(0, 0, -1)

		# This specific rotation matrix assumes using CIL standards (z-)
		gvxr.setSceneRotationMatrix((-0.11599329859018326, -0.580069899559021, 0.8062660098075867, 0.0, 0.9919215440750122, -0.025721648707985878, 0.1241975873708725, 0.0, -0.05130457878112793, 0.8141602873802185, 0.578368604183197, 0.0, 0.0, 0.0, 0.0, 1.0))
		gvxr.setWindowBackGroundColour(0.94, 0.98, 1)

		gvxr.rotateNode("root", 90, 0, 1, 0)

	def SimSingleProjection(self) -> np.ndarray:
		image = np.array(gvxr.computeXRayImage())

		image_in_kev = image / gvxr.getUnitOfEnergy("keV")

		# Do not perform normalisation in simulator, that is done futher up the
		# chain.
		# return (image - dark) / (white - dark)

		return image_in_kev

	def SimAllProjections(self) -> np.ndarray:
		img1 = np.array(gvxr.computeXRayImage())
		images = np.empty((self.capture.projections, *img1.shape))

		for i in trange(0, self.capture.angles.shape[0]):
			images[i] = gvxr.computeXRayImage()
			gvxr.rotateNode("root", self.capture.angle_delta, 0, 0, 1)

		# Currently removed from gvxr; pending a rewrite
		# images = np.asarray(gvxr.computeProjectionSet(0, 0, 0, "mm", self.capture.projections, self.capture.angle_delta))

		images_in_kev = images / gvxr.getUnitOfEnergy("keV")

		return images_in_kev

	def DetectorEnergyResponse(self) -> EnergyResponse:
		if (self.detector.scintillator.material != SCINTILLATOR_MATERIAL.NONE):

			# coerce tuple into energy response class
			incident_output = gvxr.getEnergyResponse("keV")
			response = EnergyResponse(
				incident=tuple([x[0] for x in incident_output]),
				output=tuple([x[1] for x in incident_output])
				)

			return response
		else:
			# Perfect linear response if no detector energy response
			return EnergyResponse(tuple(np.arange(0, 300, dtype=float)), tuple(np.arange(0, 300, dtype=float)))

	@property
	def beam(self) -> Beam:
		return self._beam

	@beam.setter
	def beam(self, value: Beam) -> None:
		print(value)
		if value.params.projection == PROJECTION.POINT:
			gvxr.usePointSource()
			if value.params.spotSize != 0:
				gvxr.setFocalSpot(*self.capture.beam_position, value.params.spotSize, "mm", 3)
			else:
				# workaround to disable focalspot
				if self.capture is not None:
					gvxr.setSourcePosition(*self.capture.beam_position, "mm")
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
		if self.capture is not None:
			if isinstance(value.params, LabBeam):
				gvxr.enablePoissonNoise()
				lab = cast(LabBeam, value.params)
				mAs = (lab.intensity / 1000) * lab.exposure

				electron_charge = 1.602e-19  # [C]
				photon_count = mAs * (1.0e-3 / electron_charge) * (1 / ((self.capture.SDD * 10) ** 2))

				gvxr.setNumberOfPhotonsPerCM2(photon_count)
		self._beam = value

	@property
	def detector(self) -> DetectorParameters:
		return self._detector

	@detector.setter
	def detector(self, value: DetectorParameters) -> None:
		if value.lsf is not None:
			gvxr.setLSF(value.lsf)
		else:
			gvxr.setLSF([0,1,0])
		if self.quality == Quality.MEDIUM or self.quality == Quality.HIGH:
			gvxr.setDetectorNumberOfPixels(value.shape[1], value.shape[0])
			gvxr.setDetectorPixelSize(value.pixel_size, value.pixel_size, "mm")
		elif self.quality == Quality.LOW:
			gvxr.setDetectorNumberOfPixels(value.shape[1] // 2, value.shape[0] // 2)
			gvxr.setDetectorPixelSize(value.pixel_size * 2, value.pixel_size * 2, "mm")
		elif self.quality == Quality.PREVIEW:
			shape = [0, 0]
			maxax = np.argmax(value.shape)
			minax = np.argmin(value.shape)

			if maxax == minax:
				# both axis are the same
				shape = (100, 100)
			else:
				shape[maxax] = 100
				shape[minax] = int((value.shape[minax] / value.shape[maxax]) * 100)
				shape = tuple(shape)

			# pixel scale factor
			scale = value.shape[maxax] / 100

			gvxr.setDetectorNumberOfPixels(*shape)
			gvxr.setDetectorPixelSize(value.pixel_size * scale, value.pixel_size * scale, "mm")

		if (value.scintillator.material is not SCINTILLATOR_MATERIAL.NONE) and (value.scintillator.material is not SCINTILLATOR_MATERIAL.CUSTOM):
			gvxr.setScintillator(str(value.scintillator.material.value), value.scintillator.thickness, "mm")
		else:
			gvxr.clearDetectorEnergyResponse()

		self._detector = value

	@property
	def samples(self) -> List[RenderedSample]:
		return self._samples

	@samples.setter
	def samples(self, value: List[RenderedSample]) -> None:
		gvxr.removePolygonMeshesFromSceneGraph()
		for sample in value:
			label = sample.label
			mat: Material = sample.material

			if isinstance(mat, SpecialMaterial):
				if mat.matType == SpecialMaterialEnum.air:
					# Don't add meshes that are air
					continue
				else:
					raise NotImplementedError(f"Special material {mat.matType} not implemented.")

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

	@property
	def capture(self) -> CaptureParameters:
		return self._capture

	@capture.setter
	def capture(self, value: CaptureParameters) -> None:
		print(value)
		gvxr.setDetectorPosition(*value.detector_position, "mm")
		if self.beam.params.spotSize == 0.0:
			# if using a spot size, the focal point is handled in beam settings
			gvxr.setSourcePosition(*value.beam_position, "mm")
		# Changing detector/source position will effect if the source is in
		# parallel or point mode. We re-set the beam value to fix this.
		self.beam = self._beam

		# Undo rotations in order to reset scene rotation matrix
		gvxr.rotateScene(-1 * self.total_rotation[2], 0, 0, 1)
		gvxr.rotateScene(-1 * self.total_rotation[1], 0, 1, 0)
		gvxr.rotateScene(-1 * self.total_rotation[0], 1, 0, 0)
		self.total_rotation = value.sample_rotation

		gvxr.rotateScene(value.sample_rotation[0], 1, 0, 0)
		gvxr.rotateScene(value.sample_rotation[1], 0, 1, 0)
		gvxr.rotateScene(value.sample_rotation[2], 0, 0, 1)
		self._capture = value

	@property
	def quality(self) -> Quality:

		return self._quality

	@quality.setter
	def quality(self, value) -> None:
		self._quality = value
		# Update detector with new quality settings
		self.detector = self._detector

	def RenderScene(self) -> Tuple[Tuple[float]]:
		gvxr.displayScene()

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

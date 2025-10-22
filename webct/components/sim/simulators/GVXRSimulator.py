from datetime import datetime
from pathlib import Path
from typing import cast
from zlib import crc32

import numpy as np
from gvxrPython3 import gvxr, twins
from matplotlib.colors import hsv_to_rgb
from tqdm import trange

from webct import model_folder
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


def colour_from_string(string: str) -> tuple[float, float, float]:
	"""Deterministically create an rgb colour from a given string.

	The same text input will always return the same colour.

	Args:
		string (str): String to create a colour from.

	Returns:
		Tuple[float,float,float]: A series of 0.0 - 1.0 floats representing (R, G, B)

	"""
	return tuple(hsv_to_rgb((float(crc32(string.encode("utf-8")) & 0xFFFFFFFF) / 2**32, 0.75, 0.9)))


class GVXRSimulator(Simulator):
	"""X-Ray simulator implemented using gvirtualxray."""

	total_rotation: tuple[float, float, float] = (0, 0, 0)
	laminography: bool = False
	twin: str
	_twin: twins.DigitalTwin

	def __init__(self, sid: str, pid: int) -> None:
		super().__init__(sid=sid, pid=pid)
		self.firstSetup = False
		self.twin = "none"

		# Use local timezone datetime object
		now = datetime.now()  # noqa: DTZ005

		folder = Path(f"logs/{now.strftime('%Y-%m-%d')}/")
		log_file = folder / f"GVXR-{now.strftime('%H-%M')}-{self._sid}-{self._pid}.log"

		log_file.mkdir(parents=True, exist_ok=True)
		gvxr.useLogFile(str(log_file))
		self._initRenderer()

	def _initRenderer(self) -> None:
		gvxr.createWindow(-1, 0, "OpenGL")
		gvxr.setWindowSize(1800, 600)

		gvxr.removePolygonMeshesFromSceneGraph()
		gvxr.disableArtefactFiltering()
		gvxr.setDetectorUpVector(0, 0, -1)

		# This specific rotation matrix assumes using CIL standards (z-)
		gvxr.setSceneRotationMatrix(
			(
				-0.11599329859018326,
				-0.580069899559021,
				0.8062660098075867,
				0.0,
				0.9919215440750122,
				-0.025721648707985878,
				0.1241975873708725,
				0.0,
				-0.05130457878112793,
				0.8141602873802185,
				0.578368604183197,
				0.0,
				0.0,
				0.0,
				0.0,
				1.0,
			),
		)
		gvxr.setWindowBackGroundColour(0.94, 0.98, 1)

		gvxr.rotateNode("root", 90, 0, 1, 0)

	def RenderScene(self) -> tuple[tuple[float]]:
		gvxr.displayScene()
		# gvxr.renderLoop()

		# Zoom scene
		dist = np.asarray(gvxr.getDetectorPosition("mm")) - np.asarray(gvxr.getSourcePosition("mm"))

		zoom = abs(dist[1]) * 0.5
		if zoom < self.detector.pixel_size * 2000:
			zoom += (7 - np.log(zoom)) * ((self.detector.pixel_size * 1000) / 2)

		gvxr.setZoom(zoom)

		# Update scene
		gvxr.displayScene()
		gvxr.takeScreenshot()
		gvxr.displayScene()

		return gvxr.takeScreenshot()

	# ======================================================== #

	# ======================================================== #

	@property
	def beam(self) -> Beam:
		return self._beam

	@beam.setter
	def beam(self, value: Beam) -> None:
		if value.params.twin != "none":
			# Set twin and use twin methods
			self.twin = value.params.twin
			self._beam_twin(value)
		else:
			self._beam_custom(value)
		self._beam = value

	def _beam_custom(self, value: Beam) -> None:
		if value.params.projection == PROJECTION.POINT:
			gvxr.usePointSource()
			# Focal spot is setup in capture, as it changes beam position.
		elif value.params.projection == PROJECTION.PARALLEL:
			gvxr.useParallelBeam()
		else:
			raise NotImplementedError("Only parallel or point sources are supported.")

		# setup spectra
		gvxr.resetBeamSpectrum()
		for i in range(len(value.spectra.energies)):
			gvxr.addEnergyBinToSpectrum(value.spectra.energies[i], "keV", value.spectra.photons[i])

		# setup noise
		if value.params.enableNoise and self.capture is not None:
			if isinstance(value.params, (LabBeam, MedBeam)):
				gvxr.enablePoissonNoise()
				mAs = 1
				if isinstance(value.params, LabBeam):
					lab = cast("LabBeam", value.params)
					mAs = (lab.intensity / 1000) * lab.exposure
				else:
					med = cast("MedBeam", value.params)
					mAs = med.mas

				electron_charge = 1.602e-19  # [C]
				photon_count = mAs * (1.0e-3 / electron_charge)
				gvxr.setNumberOfPhotonsPerCm2At1m(photon_count)
			elif isinstance(value.params, SynchBeam):
				gvxr.enablePoissonNoise()
				synch = cast("SynchBeam", value.params)

				# flux is x10^10
				flux = synch.flux * synch.exposure
				gvxr.setNumberOfPhotonsPerCm2At1m(flux * 10e10)
			else:
				gvxr.disablePoissonNoise()
		else:
			gvxr.disablePoissonNoise()

		self._beam = value

	def _beam_twin(self, value: Beam) -> None:
		twin = twins.createDigitalTwin(name=value.params.twin)

		twin.set_beam(value.params.twin_beam)

		# filters are in mm
		filters = [[f.material.name, f.thickness] for f in value.params.filters]
		print(filters)
		twin.beam.filter = filters

		if isinstance(value.params, LabBeam):
			twin.beam.kev = value.params.voltage
			twin.beam.ua = value.params.intensity
			twin.detector.exposure = value.params.exposure

		elif isinstance(value.params, SynchBeam):
			twin.beam.kev = value.params.energy
			twin.detector.exposure = value.params.exposure

		if value.params.enableNoise:
			gvxr.enablePoissonNoise()
		else:
			gvxr.disablePoissonNoise()

		self._twin = twin

	# ======================================================== #

	@property
	def detector(self) -> DetectorParameters:
		return self._detector

	@detector.setter
	def detector(self, value: DetectorParameters) -> None:
		if self.twin != "none":
			self._detector_twin(value)
		else:
			self._detector_custom(value)

	def _detector_custom(self, value: DetectorParameters) -> None:
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

	def _detector_twin(self, value: DetectorParameters) -> None:
		# find gain in twin list
		gain_index = self._twin.specification.detector.gain.gains.index(value.gain)
		self._twin.detector.gain = gain_index

		self._twin.detector.fov = value.fov

	# ======================================================== #

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

	# ======================================================== #

	@property
	def capture(self) -> CaptureParameters:
		return self._capture

	@capture.setter
	def capture(self, value: CaptureParameters) -> None:
		if self.twin != "none":
			self._capture_twin(value)
		else:
			self._capture_custom(value)

	def _capture_custom(self, value: CaptureParameters) -> None:
		gvxr.setDetectorPosition(*value.detector_position, "mm")
		gvxr.setSourcePosition(*value.beam_position, "mm")

		if self.beam.params.spotSize != 0:
			gvxr.setFocalSpot(*self.capture.beam_position, self.beam.params.spotSize, "mm", 3)

		# Changing detector/source position will effect if the source is in
		# parallel or point mode. We re-set the beam value to fix this.
		self.beam = self._beam

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

	def _capture_twin(self, value: CaptureParameters) -> None:
		# twin uses z axis instead of y
		source = (value.beam_position[0], value.beam_position[2], value.beam_position[1])
		detector = (value.detector_position[0], value.detector_position[2], value.detector_position[1])

		self._twin.beam.position = source
		self._twin.detector.position = detector

	# ======================================================== #

	def SimSingleProjection(self) -> np.ndarray:
		if self.twin != "none":
			self._twin.apply()

		if self.detector.enableGain:
			image = self.simulate_single()
			image *= 60000
			return image.astype(np.uint16)

		return self.simulate_single()

	# ======================================================== #

	def simulate_single(self) -> np.ndarray:
		# workaround, doesn't seem to be set properly in init
		gvxr.disableArtefactFiltering()

		# if no samples are loaded, gvxr crashes.
		# As a workaround, simulate white images if the number of samples is 0.
		# This makes it easier to deal with on the frontend.
		white = np.asarray(gvxr.getWhiteImage())
		if len(self.samples.samples) == 0:
			return white / white.max()
		# xray = np.zeros_like(self.detector.binned_shape, dtype=float)
		xray = np.asarray(gvxr.computeXRayImage())
		print("-"*10)
		print(xray.max())
		print(xray.min())
		print("-"*10)
		return xray / white

	def simulate_single_gain(self) -> np.ndarray:
		xray = np.zeros(self.detector.binned_shape, dtype=np.uint16)
		# compute xray image and store into python-managed uint16 array
		# don't apply flatfield normalisation
		gvxr.computeXRayImageWithGain(xray)
		return xray

	# ======================================================== #

	def SimAllProjections(self) -> np.ndarray:
		if self.twin != "none":
			self._twin.apply()

		if self.detector.enableGain:
			return self.simulate_all_gain()

		return self.simulate_all()

	def simulate_all(self) -> np.ndarray:
		# workaround, doesn't seem to be set properly in init
		gvxr.disableArtefactFiltering()

		# ! bug:- does not take into account scene node scaling.
		# gvxr.computeCTAcquisition("", "", self.capture.projections, 0, False, self.capture.angles[-1], 1, 0, 0, 0, "mm", 0, 0, 1, True, 1)
		# images = np.asarray(gvxr.getLastProjectionSet())

		white = gvxr.getWhiteImage()
		im1 = np.asarray(gvxr.computeXRayImage())
		images = np.empty((self.capture.projections, *im1.shape))

		images[0] = im1

		for i in trange(1, self.capture.projections):
			angle = self.capture.angles[i]
			gvxr.rotateNode("root", angle, 0, 0)
			images[i] = np.asarray(gvxr.computeXRayImage())
			gvxr.rotateNode("root", -angle, 0, 0)

		return images / white

	def simulate_all_gain(self) -> np.ndarray:
		# todo: replace with correct gain handling.
		return (self.simulate_all() * 60000).astype(np.uint16)

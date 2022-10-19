from typing import List, Tuple
from gvxrPython3 import gvxr
import numpy as np

from webct.components.Beam import PROJECTION, Beam
from webct.components.Capture import CaptureParameters
from webct.components.Detector import DetectorParameters
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
		gvxr.removePolygonMeshesFromSceneGraph()
		gvxr.disableArtefactFiltering()
		gvxr.setDetectorUpVector(0, 0, -1)
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

		print(self.capture.angle_delta)

		images = np.asarray(gvxr.computeProjectionSet(0, 0, 0, "mm", self.capture.projections, self.capture.angle_delta))

		images_in_kev = images / gvxr.getUnitOfEnergy("keV")

		return images_in_kev

	@property
	def beam(self) -> Beam:
		return self._beam

	@beam.setter
	def beam(self, value: Beam) -> None:
		if value.params.projection == PROJECTION.POINT:
			gvxr.usePointSource()
		elif value.params.projection == PROJECTION.PARALLEL:
			gvxr.useParallelBeam()
		else:
			raise NotImplementedError("Only parallel or point sources are supported.")
		gvxr.resetBeamSpectrum()
		for i in range(0, len(value.spectra.energies)):
			gvxr.addEnergyBinToSpectrum(
				value.spectra.energies[i], "keV", value.spectra.photons[i]
			)
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
		print(type(self.detector))
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

			print(shape)
			print(value.pixel_size * scale)
			gvxr.setDetectorNumberOfPixels(*shape)
			gvxr.setDetectorPixelSize(value.pixel_size * scale, value.pixel_size * scale, "mm")

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
			gvxr.moveToCenter(label)

	@property
	def capture(self) -> CaptureParameters:
		return self._capture

	@capture.setter
	def capture(self, value: CaptureParameters) -> None:
		gvxr.setDetectorPosition(*value.detector_position, "mm")
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

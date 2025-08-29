import os
from datetime import datetime
from zlib import crc32
import numpy as np

from gvxrPython3 import gvxr, twins
from matplotlib.colors import hsv_to_rgb

from webct import model_folder
from webct.components.Twin import get_twins
from webct.components import Material
from webct.components.Beam import Beam
from webct.components.Capture import CaptureParameters
from webct.components.Detector import DetectorParameters
from webct.components.Samples import RenderedSampleSettings
from webct.components.sim.simulators import Simulator


def colour_from_string(string: str) -> tuple[float, float, float]:
	"""Deterministically Creates a rgb colour from a given string.

	The same text input will always return the same colour.

	Args:
		string (str): String to create a colour from.

	Returns:
		Tuple[float,float,float]: A series of 0.0 - 1.0 floats representing (R, G, B)

	"""  # noqa: D206
	return hsv_to_rgb((float(crc32(string.encode("utf-8")) & 0xFFFFFFFF) / 2**32, 0.75, 0.9))



class GVXRSimulator2(Simulator):
	total_rotation: tuple[float, float, float] = (0, 0, 0)
	laminography:bool = False

	twin:str
	twin_beam:str
	beam:Beam
	detector:DetectorParameters
	capture:CaptureParameters


	def __init__(self, sid:str, pid:int) -> None:
		super().__init__(sid=sid, pid=pid)
		self.firstSetup = False
		os.makedirs(f"logs/{datetime.now().strftime('%Y-%m-%d')}/", exist_ok=True)
		gvxr.useLogFile(
			f"logs/{datetime.now().strftime('%Y-%m-%d')}/GVXR-{datetime.now().strftime('%H-%M')}-{self._sid}-{self._pid}.log",
		)
		self._initRenderer()

	def _initRenderer(self):
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

			if isinstance(mat, Material.ElementMaterial):
				gvxr.setElement(label, mat.element)
			elif isinstance(mat, Material.CompoundMaterial):
				gvxr.setCompound(label, mat.compound)
			elif isinstance(mat, Material.MixtureMaterial):
				gvxr.setMixture(label, mat.atomicNumbers, mat.weights)
			elif isinstance(mat, Material.HUMaterial):
				gvxr.setHU(label, mat.HUunit)
			else:
				raise NotImplementedError(f"Invalid MaterialType '{type(mat)}' {mat}")

			# Density has to be set after setting the mixture, otherwise gvxr crashes.
			if not isinstance(mat, Material.HUMaterial):
				gvxr.setDensity(label, mat.density, "g/cm3")

			gvxr.setColour(label, *colour_from_string(label), 1)
			gvxr.moveToCenter(label)

		# Apply global sample properties
		gvxr.scaleScene(value.scaling, value.scaling, value.scaling, "mm")
		self._samples = value

		def SimSingleProjection(self) -> np.ndarray:
		# workaround, doesn't seem to be set properly in init
		gvxr.disableArtefactFiltering()

		# workaround for inf projections after stage movement
		print("beamset2")
		self.beam = self._beam

		# if no samples are loaded, gvxr crashes.
		# As a workaround, simulate white images if the number of samples is 0.
		# This makes it easier to deal with on the frontend.
		white = np.asarray(gvxr.getWhiteImage())
		if len(self.samples.samples) == 0:
			return white / white.max()
		xray = np.asarray(gvxr.computeXRayImage())
		print(xray)
		return xray / white


	def apply(self) -> None:
		twin = None
		for t in get_twins():
			if t["name"] == self.beam.params.twin:
				twin = twins.DigitalTwin.from_json(t)

		if twin is not None:
			twin.beam.filter = self.beam.params.filters

			if twin.specification.

			twin.beam.

			twin.detector.fov = self.detector.


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

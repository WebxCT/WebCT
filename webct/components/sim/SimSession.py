from enum import Enum
from random import Random
from threading import Semaphore
from typing import List, Optional, Tuple

import numpy as np
from cil.framework import AcquisitionGeometry
from cil.utilities.display import show_geometry
from flask import session
from matplotlib.backends.backend_agg import FigureCanvasAgg
from matplotlib.figure import Figure
from PIL import Image

from webct import Element
from webct.components.Beam import (BEAM_GENERATOR, PROJECTION, BeamParameters, Filter, LabBeam, Spectra, generateSpectra)
from webct.components.Capture import CaptureParameters
from webct.components.Detector import DetectorParameters
from webct.components.Reconstruction import (FBPParam, ReconParameters, reconstruct)
from webct.components.Samples import RenderedSample, Sample
from webct.components.sim.clients.SimClient import SimClient
from webct.components.sim.Quality import Quality
from webct.components.sim.SimManager import getClient

class ProjCorrection(Enum):
	# No correction is done, projections are a direct result from the detector.
	NONE = 1

	# Flatfield and darkfield normalisation has taken place.
	FLATFIELD = 2

	# Conversion from absorbtion measurements to transmission measurements have taken place.
	ABSORBTION = 3

class SimSession:
	"""
	A simulator session, storing current simulation parameters and outputs.
	"""

	_beam_param: BeamParameters
	_detector_param: DetectorParameters
	_beam_spectra: Spectra
	_unfiltered_beam_spectra: Spectra
	_simClient: SimClient
	_samples: Tuple[Sample]
	_samples_rendered: Tuple[RenderedSample]
	_capture_param: CaptureParameters
	_counter: int = 1

	# Save a flag if parameters have changed since last projection creation
	_dirty: List[bool] = [False, False, False]
	_projections: dict[Quality, np.ndarray]
	_projection: dict[Quality, np.ndarray]
	_reconstruction: dict[Quality, np.ndarray]
	_recon_param: ReconParameters

	# since flask runs python code concurrently, we need to ensure the simclient
	# class is not used by multiple threads at once; or we have concurrency
	# issues when talking to the simulator.
	_lock: Semaphore

	def __init__(self, sid: int) -> None:
		self._simClient = getClient(session)
		self._lock = Semaphore(1)
		self._sid = sid

		# Instantiate default values
		self.beam = LabBeam(method="lab", projection=PROJECTION.POINT,
			filters=(Filter(Element.Cu,2),),
			voltage=70,
			exposure=1,
			intensity=120,
			spotSize=0,
			anodeAngle=12,
			generator=BEAM_GENERATOR.SPEKPY,
			material=Element.W
		)
		self.detector = DetectorParameters(250, 250, 0.5, None, None)
		self.samples = (
			Sample(
				"Dragon Model",
				"welsh-dragon-small.stl",
				"mm",
				"element/aluminium",
			),
		)
		self.capture = CaptureParameters(360, 360, (0, 100, 0), (0, -400, 0), (0, 0, 90))
		self.recon = FBPParam(quality=Quality.MEDIUM, filter="ram-lak")

	@property
	def beam(self) -> BeamParameters:
		with self._lock:
			return self._beam_param

	@beam.setter
	def beam(self, value: BeamParameters) -> None:
		with self._lock:
			if hasattr(self, "_beam_param") and value == self._beam_param:
				return
			self._dirty = [True, True, True]
			self._counter += 1
			print(f"[SC-{self._sid}-{self._simClient.pid}]-Lock-{self._counter}-beam")
			self._beam_param = value
			self._beam_spectra, self._unfiltered_beam_spectra = generateSpectra(value)
			self._simClient.setBeam(value, self._beam_spectra)
			self._setupFields()

	@property
	def spectra(self) -> Spectra:
		with self._lock:
			return self._beam_spectra

	@property
	def unfilteredSpectra(self) -> Spectra:
		with self._lock:
			return self._unfiltered_beam_spectra

	@property
	def samples(self) -> Tuple[Sample]:
		with self._lock:
			return self._samples

	@samples.setter
	def samples(self, value: Tuple[Sample]) -> None:
		with self._lock:
			if hasattr(self, "_samples") and value == self._samples:
				return
			self._dirty = [True, True, True]
			self._counter += 1
			print(
				f"[SC-{self._sid}-{self._simClient.pid}]-Lock-{self._counter}-samples"
			)

			# rendering samples may call a value error, let this propagate upwards
			self._samples_rendered = tuple([sample.render() for sample in value])

			self._samples = value
			print(f"Samples now {value}")

			# We only send rendered samples to the simulation client.
			# Only reason we store both unrendered and rendered, are for `self.update()`
			self._simClient.setSamples(self._samples_rendered)

	def update(self) -> None:
		"""Re-render sample properties to propagate material changes to the simulator."""
		with self._lock:
			# rendering samples may call a value error, let this propagate upwards
			new_samples = tuple([sample.render() for sample in self._samples])

			if new_samples == self._samples_rendered:
				# Don't update the client if there is nothing to change.
				return

			# Sample materials have changed, update client.
			self._counter += 1
			print(f"[SC-{self._sid}-{self._simClient.pid}]-Lock-{self._counter}-samples-update")
			self._samples_rendered = new_samples
			self._simClient.setSamples(self._samples_rendered)

	@property
	def detector(self) -> DetectorParameters:
		with self._lock:
			return self._detector_param

	@detector.setter
	def detector(self, value: DetectorParameters) -> None:
		with self._lock:
			if hasattr(self, "_detector_param") and value == self._detector_param:
				return
			self._dirty = [True, True, True]
			self._counter += 1
			print(
				f"[SC-{self._sid}-{self._simClient.pid}]-Lock-{self._counter}-detector"
			)
			self._detector_param = value
			self._simClient.setDetector(value)
			self._setupFields()

	def _setupFields(self) -> None:
		print("setupfield")
		if not hasattr(self, "_detector_param") or not hasattr(self, "_beam_param") or self._detector_param is None or self._beam_param is None:
			# Missing detector or beam params, do nothing.
			return

		# construct fields from detector shape
		self._darkfield: np.ndarray = np.zeros(self._detector_param.shape)
		flatfield = np.ones(self._detector_param.shape)
		# count total energy
		flatfield *= np.sum(np.array(self._beam_spectra.energies) * np.array(self._beam_spectra.photons))
		self._flatfield: np.ndarray = flatfield
		print(self.flatfield.mean())
		print(self.darkfield.mean())

	def _corrected(self, projection, correction=ProjCorrection.FLATFIELD):
		if correction==ProjCorrection.NONE:
			# Perform no correction
			return projection

		proj = None

		# resize fields to patch the image
		if (projection.shape[-2:] != self.flatfield.shape):
			print(projection.shape)
			print(projection.shape[-2:])
			# Resize fields

			flatfield = np.array(Image.fromarray(self.flatfield).resize(projection.shape[-2:]))
			darkfield = np.array(Image.fromarray(self.darkfield).resize(projection.shape[-2:]))
			proj = (projection - darkfield) / (flatfield - darkfield)
		else:
			# Don't need to resize
			proj = (projection - self.darkfield) / (self.flatfield - self.darkfield)

		if correction == ProjCorrection.FLATFIELD:
			return proj
		raise NotImplementedError(f"Projection Correction {correction} is not implemented.")

	def projection(self, quality=Quality.MEDIUM, corrected=True) -> np.ndarray:
		with self._lock:
			if self._dirty[0] and not self._dirty[1] and quality in self._projections:
				# Just nick first proj from allprojections
				return self._corrected(self._projections[quality][0]) if corrected else self._projections[quality][0]
			if not self._dirty[0] and hasattr(self, "_projection") and quality in self._projection:
				print("Using cached projection")
				return self._projection[quality]
			self._counter += 1
			print(
				f"[SC-{self._sid}-{self._simClient.pid}]-Lock-{self._counter}-Projection-{quality.name}"
			)
			if self._dirty[0]:
				self._projection = {}
				self._dirty[0] = False

			self._projection[quality] = self._simClient.getProjection(quality)
			return self._corrected(self._projection[quality]) if corrected else self._projection[quality]

	def allProjections(self, quality=Quality.MEDIUM, corrected=True) -> np.ndarray:
		with self._lock:
			if not self._dirty[1] and hasattr(self, "_projections") and quality in self._projections:
				print("Using cached projections")
				return self._corrected(self._projections[quality]) if corrected else self._projections[quality]
			self._counter += 1
			print(
				f"[SC-{self._sid}-{self._simClient.pid}]-Lock-{self._counter}-All-Projections-{quality.name}"
			)
			if self._dirty[1]:
				self._projections = {}
				self._dirty[1] = False

			self._projections[quality] = self._simClient.getAllProjections(quality)
			return self._corrected(self._projections[quality]) if corrected else self._projections[quality]

	def layout(self) -> np.ndarray:
		geo: Optional[AcquisitionGeometry] = None
		if self.beam.projection == PROJECTION.PARALLEL:
			geo = AcquisitionGeometry.create_Parallel3D(detector_position=self.capture.detector_position)
		elif self.beam.projection == PROJECTION.POINT:
			geo = AcquisitionGeometry.create_Cone3D(source_position=self.capture.beam_position, detector_position=self.capture.detector_position)
		assert geo is not None
		# Aquisition geometry
		geo.set_panel([l // self.detector.pixel_size for l in self.detector.shape][::-1], self.detector.pixel_size)
		geo.set_angles(self.capture.angles)

		# Obtain canvas from figure
		fig: Figure = show_geometry(geo, figsize=(8, 6)).figure

		width, height = fig.get_size_inches() * fig.get_dpi()
		width = int(width)
		height = int(height)

		# render matplotlib image to canvas
		canvas = FigureCanvasAgg(fig)
		canvas.draw()

		return np.frombuffer(canvas.tostring_rgb(), dtype="uint8").reshape(height, width, 3)

	@property
	def recon(self) -> ReconParameters:
		return self._recon_param

	@recon.setter
	def recon(self, value: ReconParameters) -> None:
		with self._lock:
			if hasattr(self, "_recon_param") and value == self._recon_param:
				return
			self._dirty[2] = True
			self._counter += 1
			print(f"[SC-{self._sid}-{self._simClient.pid}]-Lock-{self._counter}-ReconParams")
			self._recon_param = value

	def getReconstruction(self) -> np.ndarray:
		quality = self._recon_param.quality
		with self._lock:
			if not self._dirty[2] and hasattr(self, "_reconstruction") and quality in self._reconstruction:
				print("Using cached reconstruction")
				return self._reconstruction[quality]
			self._counter += 1
			print(
				f"[SC-{self._sid}-{self._simClient.pid}]-Lock-{self._counter}-Reconstruction-{quality.name}"
			)
			if self._dirty[2]:
				self._reconstruction = {}
				self._dirty[2] = False

			# Get projections
			# We have the lock, so disregard locking
			self._lock.release()
			projections = self.allProjections(quality=quality, corrected=False)
			self._lock.acquire()

			projections = self._corrected(projections)

			self._reconstruction[quality] = reconstruct(projections, self._capture_param, self._beam_param, self._detector_param, self._recon_param)
			return self._reconstruction[quality]

	@property
	def capture(self) -> CaptureParameters:
		with self._lock:
			return self._capture_param

	@capture.setter
	def capture(self, value: CaptureParameters) -> None:
		with self._lock:
			if hasattr(self, "_capture_param") and value == self._capture_param:
				return
			self._dirty = [True, True, True]
			self._counter += 1
			print(
				f"[SC-{self._sid}-{self._simClient.pid}]-Lock-{self._counter}-capture"
			)
			self._capture_param = value
			self._simClient.setCapture(value)

	@property
	def flatfield(self) -> np.ndarray:
		return self._flatfield

	@property
	def darkfield(self) -> np.ndarray:
		return self._darkfield


stored_sessions: dict[int, SimSession] = {}
rng = Random()
lock = Semaphore()


def Sim(sesh) -> SimSession:
	with lock:
		session.update()

		if sesh.get("sid") is None:
			# Only one session is currently supported
			sid = 1

			# sid = rng.randint(0, 10000)
			# while sid in stored_sessions:
			# 	sid = rng.randint(0, 10000)
			sesh["sid"] = sid

		sid = int(sesh["sid"])

		if sid in stored_sessions:
			return stored_sessions[sid]
		else:
			print("sid is not in stored_sessions, creating a new one")
			stored_sessions[sid] = SimSession(sid)
			return stored_sessions[sid]

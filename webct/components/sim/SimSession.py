from enum import Enum
from random import Random
from threading import Semaphore
from typing import List, Optional, Tuple
import logging
log = logging.getLogger("SimSession")

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
from webct.components.Detector import DEFAULT_LSF, SCINTILLATOR_MATERIAL, DetectorParameters, Scintillator
from webct.components.Reconstruction import (FDKParam, ReconParameters, reconstruct)
from webct.components.Samples import RenderedSampleSettings, Sample, SampleSettings
from webct.components.sim.Download import DownloadManager
from webct.components.sim.clients.SimClient import SimClient, SimThreadError, SimTimeoutError
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
	_samples: SampleSettings
	_samples_rendered: RenderedSampleSettings
	_capture_param: CaptureParameters
	_counter: int = 1

	# Save a flag if parameters have changed since last projection creation
	_dirty: List[bool] = [False, False, False]
	_projections: np.ndarray
	_projection: np.ndarray
	_reconstruction: np.ndarray
	_recon_param: ReconParameters
	_scene: Optional[np.ndarray]
	_dlmanager:DownloadManager

	# since flask runs python code concurrently, we need to ensure the simclient
	# class is not used by multiple threads at once; or we have concurrency
	# issues when talking to the simulator.
	_lock: Semaphore

	def __init__(self, sid: int) -> None:
		log.info(f"Initializing Simulation Session [{sid}]")
		self._lock = Semaphore(1)
		self._sid = sid
		self._simClient = getClient(session, sid)
		self.download = DownloadManager(self)
		self.init_default_parameters()

	def init_default_parameters(self) -> None:
		# Instantiate default values
		self.beam = LabBeam(method="lab", projection=PROJECTION.POINT,
			filters=(Filter(Element.Cu,2),),
			voltage=70,
			enableNoise=True,
			exposure=1,
			intensity=120,
			spotSize=0,
			anodeAngle=12,
			generator=BEAM_GENERATOR.SPEKPY,
			material=Element.W
		)
		self.detector = DetectorParameters(
			pane_height=300,
			pane_width=250,
			pixel_size=0.5,
			lsf=DEFAULT_LSF,
			enableLSF=True,
			scintillator=Scintillator(SCINTILLATOR_MATERIAL.GADOX, 136.55 / 1000),
			binning = 1,
			)
		self.samples = SampleSettings(
			scaling = 1.0,
			samples = (
				Sample("Dragon Model", "welsh-dragon-small.stl", "mm", "element/aluminium"),
			),
		)
		self.capture = CaptureParameters(360, 360, (0, 100, 0), (0, -400, 0), (0, 0, 90))
		self.recon = FDKParam(filter="ram-lak")

	@property
	def beam(self) -> BeamParameters:
		with self._lock:
			return self._beam_param

	@beam.setter
	def beam(self, value: BeamParameters) -> None:
		with self._lock:
			if hasattr(self, "_beam_param") and value == self._beam_param:
				return
			log.info(f"[{self._sid}] Updating beam")
			self._dirty = [True, True, True]
			self._counter += 1
			self._beam_param = value
			self._beam_spectra, self._unfiltered_beam_spectra = generateSpectra(value)
			try:
				self._simClient.setBeam(value, self._beam_spectra)
			except SimThreadError as e:
				log.error("Thread Error while setting beam parameters! Forcefully killing Client...")
				self._simClient.kill()
				log.error("Replacing Simulator Child with a new one...")
				self._simClient = SimClient(self._sid)
				raise e

	@property
	def spectra(self) -> Spectra:
		with self._lock:
			return self._beam_spectra

	@property
	def unfilteredSpectra(self) -> Spectra:
		with self._lock:
			return self._unfiltered_beam_spectra

	@property
	def samples(self) -> SampleSettings:
		with self._lock:
			return self._samples

	@samples.setter
	def samples(self, value:SampleSettings) -> None:
		with self._lock:
			if hasattr(self, "_samples") and value == self._samples:
				return
			log.info(f"[{self._sid}] Updating Samples")
			self._dirty = [True, True, True]
			self._counter += 1

			# rendering samples may call a value error, let this propagate upwards before we set samples.
			self._samples_rendered = value.render()
			self._samples = value

			# We only send rendered samples to the simulation client.
			# Only reason we store both unrendered and rendered, are for `self.update()`
			try:
				self._simClient.setSamples(self._samples_rendered)
			except SimThreadError as e:
				log.error("Thread Error while setting samples! Forcefully killing Client...")
				self._simClient.kill()
				log.error("Replacing Simulator Child with a new one...")
				self._simClient = SimClient(self._sid)
				raise e

	def update(self) -> None:
		"""Re-render sample properties to propagate material changes to the simulator."""
		with self._lock:
			log.info(f"[{self._sid}] Rendering sample properties")
			# rendering samples may call a value error, let this propagate upwards
			new_samples = self._samples.render()

			if new_samples == self._samples_rendered:
				# Don't update the client if there is nothing to change.
				return

			# sample materials have changed, update client.
			self._counter += 1
			self._samples_rendered = new_samples
			try:
				self._simClient.setSamples(self._samples_rendered)
			except SimThreadError as e:
				log.error("Thread Error while re-rendering samples! Forcefully killing Client...")
				self._simClient.kill()
				log.error("Replacing Simulator Child with a new one...")
				self._simClient = SimClient(self._sid)
				raise e

	@property
	def detector(self) -> DetectorParameters:
		with self._lock:
			return self._detector_param

	@detector.setter
	def detector(self, value: DetectorParameters) -> None:
		with self._lock:
			if hasattr(self, "_detector_param") and value == self._detector_param:
				return
			log.info(f"[{self._sid}] Updating Detector")
			self._dirty = [True, True, True]
			self._counter += 1
			self._detector_param = value
			try:
				self._simClient.setDetector(value)
			except SimThreadError as e:
				log.error("Thread Error while setting detector parameters! Forcefully killing Client...")
				self._simClient.kill()
				log.error("Replacing Simulator Child with a new one...")
				self._simClient = SimClient(self._sid)
				raise e

	def transmission_histogram(self) -> Tuple[List[float], List[float]]:
		projection = self.projection()

		hist, bins = np.histogram(projection, 100, (0, 1))

		# normalize hist to be a percentage
		hist = hist / hist.max()

		# Remove last bin (99% + 100%) due to it oversaturating the histogram by a wide margin
		# This is because it represents air, which is always 100% transmission, so just drop it.
		hist = hist[:-1]
		bins = bins[:-1]

		return hist.astype(float).tolist(), bins.astype(float).tolist()

	def projection(self) -> np.ndarray:
		with self._lock:
			if self._dirty[0] and not self._dirty[1]:
				# Just nick first proj from allprojections
				return self._projections[0]
			if not self._dirty[0] and hasattr(self, "_projection"):
				return self._projection
			self._counter += 1
			if self._dirty[0]:
				self._projection = {}
				self._dirty[0] = False
				self._scene = None

			try:
				self._projection = self._simClient.getProjection()
			except SimThreadError as e:
				log.error("Thread Error while simulating one projection! Forcefully killing Client...")
				self._simClient.kill()
				log.error("Replacing Simulator Child with a new one...")
				self._simClient = SimClient(self._sid)
				raise e
			return self._projection

	def scene(self) -> np.ndarray:
		with self._lock:
			if not self._dirty[0] and hasattr(self, "_scene") and self._scene is not None:
				return self._scene
			self._counter += 1

			try:
				self._scene = self._simClient.getScene()
			except SimThreadError as e:
				log.error("Thread Error while rendering scene! Forcefully killing Client...")
				self._simClient.kill()
				log.error("Replacing Simulator Child with a new one...")
				self._simClient = SimClient(self._sid)
				raise e
			return self._scene

	def allProjections(self) -> np.ndarray:
		with self._lock:
			if not self._dirty[1] and hasattr(self, "_projections"):
				return self._projections
			self._counter += 1
			if self._dirty[1]:
				self._projections = {}
				self._dirty[1] = False
			try:
				self._projections = self._simClient.getAllProjections()
			except SimThreadError as e:
				if isinstance(e, SimTimeoutError):
					log.error("Waited too long (>1s per projection) to render all projections. Unsure if simulator crashed since it's not responding. Forcefully killing Client...")
				else:
					log.error("Thread Error while simulating all projections! Forcefully killing Client...")
				self._simClient.kill()
				log.error("Replacing Simulator Child with a new one...")
				self._simClient = SimClient(self._sid)
				raise e
			return self._projections

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
			log.info(f"[{self._sid}] Updating Reconstruction")
			self._dirty[2] = True
			self._counter += 1
			self._recon_param = value

	def getReconstruction(self) -> np.ndarray:
		with self._lock:
			if not self._dirty[2] and hasattr(self, "_reconstruction"):
				return self._reconstruction
			self._counter += 1
			if self._dirty[2]:
				self._reconstruction = {}
				self._dirty[2] = False

			# Get projections
			# We have the lock, so disregard locking
			self._lock.release()
			projections = self.allProjections()
			self._lock.acquire()

			log.info(f"[{self._sid}] Reconstructing")
			self._reconstruction = reconstruct(projections, self._capture_param, self._beam_param, self._detector_param, self._recon_param)
			return self._reconstruction

	@property
	def capture(self) -> CaptureParameters:
		with self._lock:
			return self._capture_param

	@capture.setter
	def capture(self, value: CaptureParameters) -> None:
		with self._lock:
			if hasattr(self, "_capture_param") and value == self._capture_param:
				return
			log.info(f"[{self._sid}] Updating Capture")
			self._dirty = [True, True, True]
			self._counter += 1
			self._capture_param = value
			try:
				self._simClient.setCapture(value)
			except SimThreadError as e:
				log.error("Thread Error while setting capture parameters! Forcefully killing Client...")
				self._simClient.kill()
				log.error("Replacing Simulator Child with a new one...")
				self._simClient = SimClient(self._sid)
				raise e

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
			log.info(f"Creating new Simulator Session [{sid}]")
			stored_sessions[sid] = SimSession(sid)
			return stored_sessions[sid]

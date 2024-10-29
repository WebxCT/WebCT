from abc import ABCMeta, abstractmethod
from typing import List
import numpy as np

from webct.components.Beam import Beam
from webct.components.Capture import CaptureParameters
from webct.components.Detector import DetectorParameters
from webct.components.Samples import RenderedSampleSettings


class Simulator(metaclass=ABCMeta):
	"""Simulator metaclass for all backend simulation packages.

	A simulator takes into account all beam, detector, sample, and capture
	parameters to generate artificial projections.

	Simple implementations will setup environment in individual Sim functions,
	while better implementations will incrementally update an environment by
	overriding parameter setting methods.
	"""

	def __init__(self, sid:str, pid:int) -> None:
		self._pid = pid
		self._sid = sid
		self._beam: Beam = None
		self._detector: DetectorParameters = None
		self._samples: RenderedSampleSettings = None
		self._simSettings: dict[str, str] = {}
		self._capture: CaptureParameters = None

	@abstractmethod
	def SimSingleProjection(self) -> np.ndarray:
		"""Generate a single image of the scene. Commonly used for previewing
		beam and detector parameters."""
		raise NotImplementedError()

	@abstractmethod
	def SimAllProjections(self) -> np.ndarray:
		"""Generate all projections of a scene."""
		raise NotImplementedError()

	@property
	def beam(self) -> Beam:
		return self._beam

	@beam.setter
	def beam(self, value: Beam) -> None:
		self._beam = value

	@property
	def samples(self) -> RenderedSampleSettings:
		return self._samples

	@samples.setter
	def samples(self, value: RenderedSampleSettings) -> None:
		self._samples = value

	@property
	def detector(self) -> DetectorParameters:
		return self._detector

	@detector.setter
	def detector(self, value: DetectorParameters) -> None:
		self._detector = value

	@property
	def capture(self) -> CaptureParameters:
		return self._capture

	@capture.setter
	def capture(self, value: CaptureParameters) -> None:
		self._capture = value

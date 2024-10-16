# todo: should really have some sort of heartbeat for diagnostics.
# todo: replace defining result_np with a size calculation.
# todo: split update functions into separate calls

import sys
from time import monotonic
from dataclasses import dataclass
from enum import Enum
from multiprocessing import Pipe, Process, shared_memory
from multiprocessing.connection import Connection
from random import Random
from typing import Any, Tuple
import logging
log = logging.getLogger("Simulator")

import numpy as np
from webct.components.Beam import Beam, BeamParameters, Spectra
from webct.components.Capture import CaptureParameters
from webct.components.Detector import DetectorParameters
from webct.components.Samples import RenderedSampleSettings
from webct.components.sim.simulators.GVXRSimulator import GVXRSimulator

rng = Random()


class SimThreadError(RuntimeError):
	pass


class SimTimeoutError(SimThreadError):
	pass


@dataclass(frozen=True)
class STM:
	pass


@dataclass(frozen=True)
class STM_PROJECTION(STM):
	result_sm: Any
	result_arr_shape: tuple
	result_arr_type: type

@dataclass(frozen=True)
class STM_SCENE(STM):
	pass

@dataclass(frozen=True)
class STM_ALL_PROJECTION(STM):
	result_sm: Any
	result_arr_shape: tuple
	result_arr_type: type


@dataclass(frozen=True)
class STM_BEAM(STM):
	beam: Beam


@dataclass(frozen=True)
class STM_SAMPLES(STM):
	samples: RenderedSampleSettings


@dataclass(frozen=True)
class STM_DETECTOR(STM):
	detector: DetectorParameters


@dataclass(frozen=True)
class STM_CAPTURE(STM):
	capture: CaptureParameters


class SimResponse(Enum):
	DONE = 0
	ERROR = 1
	REJECTED = 10
	ACCEPTED = 20

class SimClient(Process):
	# we store detector and capture params just to preallocate memory for
	# projections
	detector: DetectorParameters
	capture: CaptureParameters

	# ''Shared'' variables
	conn_parent: Connection
	conn_child: Connection

	# process variables
	_simulator: GVXRSimulator

	def __init__(self, sid:str):
		super(SimClient, self).__init__()
		log.info(f"[{sid}] Initializing Simulator Child")

		# Session ID is used to relate the simulator client and session
		self._sid = sid

		self.conn_parent, self.conn_child = Pipe()

	def run(self) -> None:
		# For convention's sake, all 'client' functions are underscored.
		return self._run()

	# ======================================================== #
	# ===================== Client Thread ==================== #
	# ======================================================== #

	def _run(self) -> None:
		log.info(f"({self.pid}) Client Thread Initialized!")
		end_thread = False
		# init
		self._simulator = GVXRSimulator(sid=self._sid, pid=self.pid)
		sys.stdout = sys.__stdout__
		sys.stderr = sys.__stdout__

		while not end_thread:
			input = self.conn_child.recv()
			if not isinstance(input, STM):
				# Not an expected message, ignore.
				log.info(f"({self.pid}) Got non-STM response from parent?")
				self.conn_child.send(SimResponse.REJECTED)
				continue

			elif isinstance(input, STM_BEAM):
				log.info(f"({self.pid}) Parent asking for new beam")
				self.conn_child.send(SimResponse.ACCEPTED)
				self._simulator.beam = input.beam
				self.conn_child.send(SimResponse.DONE)
				continue

			elif isinstance(input, STM_DETECTOR):
				log.info(f"({self.pid}) Parent asking for new detector")
				self.conn_child.send(SimResponse.ACCEPTED)
				self._simulator.detector = input.detector
				self.conn_child.send(SimResponse.DONE)
				continue

			elif isinstance(input, STM_CAPTURE):
				log.info(f"({self.pid}) Parent asking for new capture")
				self.conn_child.send(SimResponse.ACCEPTED)
				self._simulator.capture = input.capture
				self.conn_child.send(SimResponse.DONE)
				continue

			elif isinstance(input, STM_SAMPLES):
				log.info(f"({self.pid}) Parent asking for new samples")
				self.conn_child.send(SimResponse.ACCEPTED)
				for i, value in enumerate(input.samples.samples):
					log.info(f"({self.pid}) Sample {i}: {value.label} - {value.modelPath} - {value.material.label} - {value.material.density}")
				self._simulator.samples = input.samples
				self.conn_child.send(SimResponse.DONE)
				continue

			elif isinstance(input, STM_SCENE):
				log.info(f"({self.pid}) Parent asking for rendered scene")
				self.conn_child.send(SimResponse.ACCEPTED)
				energy_response = self._simulator.RenderScene()
				self.conn_child.send(SimResponse.DONE)
				self.conn_child.send(energy_response)

			elif isinstance(input, STM_PROJECTION):
				log.info(f"({self.pid}) Parent asking for single rendered projection")
				log.info(f"({self.pid}) Using shared memory instance [[{input.result_sm}]] : {input.result_arr_shape}")
				mem = shared_memory.SharedMemory(name=input.result_sm)
				# Wrap shared memory as np array
				sm_arr: np.ndarray = np.ndarray(
					input.result_arr_shape,
					dtype=input.result_arr_type,
					buffer=mem.buf,
				)

				# Setup done, signal to parent and start simulation
				self.conn_child.send(SimResponse.ACCEPTED)

				# copy values into shared memory
				tik = monotonic()
				log.info(f"({self.pid}) Filling [[{input.result_sm}]] with a single projection")
				np.copyto(sm_arr, self._simulator.SimSingleProjection())
				log.info(f"({self.pid}) [[{input.result_sm}]] Filled with a single projection in {monotonic() - tik:.2f}s")

				# ? Would normally close memory, but causes issues on windows
				# ? due to python bugs (plz merge the fix python comittiee <3)
				# del sm_arr
				# mem.close()

				# Respond with completed.
				self.conn_child.send(SimResponse.DONE)
				continue

			elif isinstance(input, STM_ALL_PROJECTION):
				log.info(f"({self.pid}) Parent asking for all rendered projection")
				log.info(f"({self.pid}) Using shared memory instance [[{input.result_sm}]] : {input.result_arr_shape}")
				mem = shared_memory.SharedMemory(name=input.result_sm)
				# Wrap shared memory as np array
				sm_arr: np.ndarray = np.ndarray(
					input.result_arr_shape,
					dtype=input.result_arr_type,
					buffer=mem.buf,
				)

				# Setup done, signal to parent and start simulation
				self.conn_child.send(SimResponse.ACCEPTED)

				# copy values into shared memory
				tik = monotonic()
				log.info(f"({self.pid}) Filling [[{input.result_sm}]] with all projections")
				np.copyto(sm_arr, self._simulator.SimAllProjections())
				log.info(f"({self.pid}) [[{input.result_sm}]] Filled with all projections in {monotonic() - tik:.2f}s")

				# ? Would normally close memory, but causes issues on windows
				# ? due to python bugs (plz merge the fix python comittiee <3)
				# del sm_arr
				# mem.close()

				# Respond with completed.
				self.conn_child.send(SimResponse.DONE)
				continue

	# ======================================================== #
	# ==================== Parent Methods ==================== #
	# ======================================================== #

	def check_confirm(self):
		# Check for confirmation
		response = self.response()

		# Parse confirmation response
		if not isinstance(response, SimResponse):
			raise SimThreadError(f"Expected a response, but got a {type(response)}")
		elif response is SimResponse.REJECTED:
			raise SimThreadError("Process rejected data request???")
		elif response is not SimResponse.ACCEPTED:
			raise SimThreadError(
				f"Unexpected response: {response}, wanted SimResponse.ACCEPTED"
			)
		return

	def response(self, timeout=10.0, msg="Sim timeout during request. Crashed?"):
		if not self.conn_parent.poll(timeout):
			raise SimTimeoutError(msg)
		return self.conn_parent.recv()

	def setBeam(self, beam_params: BeamParameters, spectra: Spectra):
		request = STM_BEAM(Beam(beam_params, spectra))
		self.conn_parent.send(request)

		# Check for accepted response
		self.check_confirm()

		# Response accepted, wait for done signal
		response = self.response(msg="Sim timeout while setting beam config.")

		# Parse simulation response
		if not isinstance(response, SimResponse):
			raise SimThreadError(f"Expected a response, but got a {type(response)}")
		elif response is SimResponse.DONE:
			return
		else:
			raise SimThreadError(
				f"Unexpected response: {response}, wanted SimResponse.DONE"
			)

	def setDetector(self, detector: DetectorParameters):
		# detector used for preallocation
		self.detector = detector

		request = STM_DETECTOR(detector)
		self.conn_parent.send(request)

		# Check for accepted response
		self.check_confirm()

		# Response accepted, wait for done signal
		response = self.response(msg="Sim timeout while setting detector config.")

		# Parse simulation response
		if not isinstance(response, SimResponse):
			raise SimThreadError(f"Expected a response, but got a {type(response)}")
		elif response is SimResponse.DONE:
			return
		else:
			raise SimThreadError(
				f"Unexpected response: {response}, wanted SimResponse.DONE"
			)

	def setCapture(self, capture: CaptureParameters):
		# Capture used for preallocation
		self.capture = capture

		request = STM_CAPTURE(capture)
		self.conn_parent.send(request)

		# Check for accepted response
		self.check_confirm()

		# Response accepted, wait for done signal
		response = self.response(msg="Sim timeout while setting capture config.")

		# Parse simulation response
		if not isinstance(response, SimResponse):
			raise SimThreadError(f"Expected a response, but got a {type(response)}")
		elif response is SimResponse.DONE:
			return
		else:
			raise SimThreadError(
				f"Unexpected response: {response}, wanted SimResponse.DONE"
			)

	def setSamples(self, samples: RenderedSampleSettings):
		request = STM_SAMPLES(samples)
		self.conn_parent.send(request)

		# Check for accepted response
		self.check_confirm()

		# Response accepted, wait for done signal
		response = self.response(timeout=30.0, msg="Sim timeout while setting sample settings.")

		# Parse simulation response
		if not isinstance(response, SimResponse):
			raise SimThreadError(f"Expected a response, but got a {type(response)}")
		elif response is SimResponse.DONE:
			return
		else:
			raise SimThreadError(f"Unexpected response: {response}, wanted SimResponse.DONE")

	def getProjection(self) -> np.ndarray:
		if self.detector is None:
			raise AssertionError("Detector parameters were not set before calling getProjection")

		# allocate shared memory
		result_np: np.ndarray = np.ndarray(self.detector.binned_shape, dtype=float)
		mem = shared_memory.SharedMemory(
			f"WCT_SM_GP-{self.pid}-{rng.random()}", create=True, size=result_np.nbytes
		)

		# ! Due to a bug in python, we need to explicitly access the shared
		# ! memory, otherwise it'll get deleted when the child process closes.
		# ! https://bugs.python.org/issue38119
		# ! (please merge the patch, it's been more than 3 years...)
		# ! Do not use sm_arr until an explicit DONE is received by the child.
		sm_arr: np.ndarray = np.ndarray(
			result_np.shape,
			dtype=float,
			buffer=mem.buf,
		)

		request = STM_PROJECTION(mem.name, result_np.shape, float)

		# deallocate result_np immediately
		del result_np

		# Send process request
		self.conn_parent.send(request)

		# Check for confirmation
		self.check_confirm()

		# Response accepted, wait for done signal
		response = self.response(timeout=30, msg="Sim timeout while simulating.")

		# Parse simulation response
		if not isinstance(response, SimResponse):
			raise SimThreadError(f"Expected a response, but got a {type(response)}")
		elif response is SimResponse.DONE:
			# Copy data to managed np array, close and deallocate shared space.
			result: np.ndarray = np.empty(sm_arr.shape)
			np.copyto(result, sm_arr)

			# deallocate
			mem.close()
			mem.unlink()

			# return result
			return result.astype(np.float32)
		else:
			raise SimThreadError(
				f"Unexpected response: {response}, wanted SimResponse.DONE"
			)

	def getAllProjections(self) -> np.ndarray:
		log.info(f"[{self._sid}] Generating {self.capture.projections} projections")
		if self.detector is None:
			raise AssertionError("Detector parameters were not set before calling getProjections")

		shape = (self.capture.projections, *self.detector.binned_shape)

		# allocate shared memory
		result_np: np.ndarray = np.ndarray(shape, dtype=float)
		mem = shared_memory.SharedMemory(
			f"WCT_SM_GP-{self.pid}-{rng.random()}", create=True, size=result_np.nbytes
		)

		# ! Due to a bug in python, we need to explicitly access the shared
		# ! memory, otherwise it'll get deleted when the child process closes.
		# ! https://bugs.python.org/issue38119
		# ! (please merge the patch, it's been more than 3 years...)
		# ! Do not use sm_arr until an explicit DONE is received by the child.
		sm_arr: np.ndarray = np.ndarray(
			shape,
			dtype=float,
			buffer=mem.buf,
		)

		request = STM_ALL_PROJECTION(mem.name, result_np.shape, float)

		# deallocate result_np immediately
		del result_np

		# Send process request
		self.conn_parent.send(request)

		# Check for confirmation
		self.check_confirm()

		# set timeout to number of projections, this is a worst-case scenario for most systems.
		timeout = self.capture.projections
		log.info(f"[{self._sid}] Child ({self.pid}) has {timeout}s to generate {self.capture.projections} projections, or they will be killed.")

		# Response accepted, wait for done signal
		response = self.response(timeout=timeout, msg="Sim timeout while simulating.")

		# Parse simulation response
		if not isinstance(response, SimResponse):
			raise SimThreadError(f"Expected a response, but got a {type(response)}")
		elif response is SimResponse.DONE:
			# Copy data to managed np array, close and deallocate shared space.
			result: np.ndarray = np.empty(sm_arr.shape)
			np.copyto(result, sm_arr)

			# deallocate
			mem.close()
			mem.unlink()

			# return result
			return result.astype(np.float32)
		else:
			raise SimThreadError(
				f"Unexpected response: {response}, wanted SimResponse.DONE"
			)

	def getScene(self) -> np.ndarray:
		request = STM_SCENE()
		self.conn_parent.send(request)
		self.check_confirm()
		response = self.response(msg="sim timeout while rendering scene.")

		if not isinstance(response, SimResponse):
			raise SimThreadError(f"Expected a response, but got a {type(response)}")
		elif response is SimResponse.DONE:
			scene = self.response(msg="sim timeout while generating scene.")
			if not isinstance(scene, tuple):
				raise SimThreadError(f"Unexpected scene type of '{type(scene)}', expected 'tuple'")
			return np.asarray(scene)
		else:
			raise SimThreadError(
				f"Unexpected response: {response}, wanted SimResponse.DONE"
			)

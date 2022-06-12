# todo: should really have some sort of heartbeat for diagnostics.
# todo: replace defining result_np with a size calculation.
# todo: split update functions into separate calls

import sys
from dataclasses import dataclass
from enum import Enum
from multiprocessing import Pipe, Process, shared_memory
from multiprocessing.connection import Connection
from random import Random
from typing import Any, Tuple

import numpy as np
from webct.components.Beam import Beam, BeamParameters, Spectra
from webct.components.Capture import CaptureParameters
from webct.components.Detector import DetectorParameters
from webct.components.Samples import RenderedSample
from webct.components.sim.Quality import Quality
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
	quality: Quality
	result_sm: Any
	result_arr_shape: tuple
	result_arr_type: type

@dataclass(frozen=True)
class STM_ALL_PROJECTION(STM):
	quality: Quality
	result_sm: Any
	result_arr_shape: tuple
	result_arr_type: type


@dataclass(frozen=True)
class STM_BEAM(STM):
	beam: Beam

@dataclass(frozen=True)
class STM_SAMPLES(STM):
	samples: Tuple[RenderedSample]


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

def shape_from_quality(value:tuple, quality:Quality) -> Tuple[Tuple[int, int], float]:
	shape = [0, 0]
	scale = 1.0
	if quality == Quality.HIGH or quality == Quality.MEDIUM:
		shape = value
		scale = 1.0
	elif quality == Quality.LOW:
		shape = (shape[0] // 2, shape[1] // 2)
		scale = 2
	elif quality == Quality.PREVIEW:
			shape = [0, 0]
			maxax = np.argmax(value)
			minax = np.argmin(value)

			if maxax == minax:
				# both axis are the same
				shape = (100, 100)
			else:
				shape[maxax] = 100
				shape[minax] = int((value[minax] / value[maxax]) * 100)
				shape = tuple(shape)

			# pixel scale factor
			scale = value[maxax] / 100
	return shape, scale

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

	def __init__(self):
		super(SimClient, self).__init__()

		self.conn_parent, self.conn_child = Pipe()

	def run(self) -> None:
		# For convention's sake, all 'client' functions are underscored.
		return self._run()

	# ======================================================== #
	# ===================== Client Thread ==================== #
	# ======================================================== #

	def _run(self) -> None:
		end_thread = False
		# init
		self._simulator = GVXRSimulator()
		sys.stdout = sys.__stdout__
		sys.stderr = sys.__stdout__

		while not end_thread:
			input = self.conn_child.recv()
			if not isinstance(input, STM):
				# Not an expected message, ignore.
				self.conn_child.send(SimResponse.REJECTED)
				continue

			elif isinstance(input, STM_BEAM):
				print(f"[SIM-{self.pid}] Setting beam parameters")
				self.conn_child.send(SimResponse.ACCEPTED)
				self._simulator.beam = input.beam
				self.conn_child.send(SimResponse.DONE)
				continue

			elif isinstance(input, STM_DETECTOR):
				print(f"[SIM-{self.pid}] Setting detector parameters")
				self.conn_child.send(SimResponse.ACCEPTED)
				self._simulator.detector = input.detector
				self.conn_child.send(SimResponse.DONE)
				continue

			elif isinstance(input, STM_CAPTURE):
				print(f"[SIM-{self.pid}] Setting capture parameters")
				self.conn_child.send(SimResponse.ACCEPTED)
				self._simulator.capture = input.capture
				self.conn_child.send(SimResponse.DONE)
				continue

			elif isinstance(input, STM_SAMPLES):
				print(f"[SIM-{self.pid}] Setting samples")
				self.conn_child.send(SimResponse.ACCEPTED)
				self._simulator.samples = input.samples
				self.conn_child.send(SimResponse.DONE)
				continue

			elif isinstance(input, STM_PROJECTION):
				print(f"[SIM-{self.pid}] SimSingle with memory pool {input.result_sm}")
				mem = shared_memory.SharedMemory(name=input.result_sm)
				# Wrap shared memory as np array
				sm_arr: np.ndarray = np.ndarray(
					input.result_arr_shape,
					dtype=input.result_arr_type,
					buffer=mem.buf,
				)

				# Setup done, signal to parent and start simulationF
				self.conn_child.send(SimResponse.ACCEPTED)

				# Set quality of simulator
				self._simulator.quality = input.quality

				# copy values into shared memory
				np.copyto(sm_arr, self._simulator.SimSingleProjection())

				# ? Would normally close memory, but causes issues on windows
				# ? due to python bugs (plz merge the fix python comittiee <3)
				# del sm_arr
				# mem.close()

				# Respond with completed.
				print(f"[SIM-{self.pid}] Completed, sending SimResponse.DONE")
				self.conn_child.send(SimResponse.DONE)
				continue

			elif isinstance(input, STM_ALL_PROJECTION):
				print(f"[SIM-{self.pid}] SimAll with memory pool {input.result_sm}")
				mem = shared_memory.SharedMemory(name=input.result_sm)
				# Wrap shared memory as np array
				sm_arr: np.ndarray = np.ndarray(
					input.result_arr_shape,
					dtype=input.result_arr_type,
					buffer=mem.buf,
				)

				# Setup done, signal to parent and start simulation
				self.conn_child.send(SimResponse.ACCEPTED)

				# Set quality of simulator
				self._simulator.quality = input.quality

				# copy values into shared memory
				np.copyto(sm_arr, self._simulator.SimAllProjections())

				# ? Would normally close memory, but causes issues on windows
				# ? due to python bugs (plz merge the fix python comittiee <3)
				# del sm_arr
				# mem.close()

				# Respond with completed.
				print(f"[SIM-{self.pid}] Completed, sending SimResponse.DONE")
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

	def setBeam(self, beam_params:BeamParameters, spectra:Spectra):
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

	def setDetector(self, detector:DetectorParameters):
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

	def setCapture(self, capture:CaptureParameters):
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

	def setSamples(self, samples:Tuple[RenderedSample]):
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
			raise SimThreadError(
				f"Unexpected response: {response}, wanted SimResponse.DONE"
			)

	def getProjection(self, quality=Quality.MEDIUM) -> np.ndarray:
		if self.detector is None:
			raise AssertionError("Detector parameters were not set before calling getProjection")

		shape, scale = shape_from_quality(self.detector.shape, quality)

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
			result_np.shape,
			dtype=float,
			buffer=mem.buf,
		)

		request = STM_PROJECTION(quality, mem.name, result_np.shape, float)

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
			print("Simulation completed.")
			return result
		else:
			raise SimThreadError(
				f"Unexpected response: {response}, wanted SimResponse.DONE"
			)

	def getAllProjections(self, quality=Quality.MEDIUM) -> np.ndarray:
		if self.detector is None:
			raise AssertionError("Detector parameters were not set before calling getProjections")

		proj_shape, scale = shape_from_quality(self.detector.shape, quality)

		shape = (self.capture.projections, *proj_shape)

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

		request = STM_ALL_PROJECTION(quality, mem.name, result_np.shape, float)

		# deallocate result_np immediately
		del result_np

		# Send process request
		self.conn_parent.send(request)

		# Check for confirmation
		self.check_confirm()

		# Response accepted, wait for done signal
		response = self.response(timeout=120, msg="Sim timeout while simulating.")

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
			print("Simulation completed.")
			return result
		else:
			raise SimThreadError(
				f"Unexpected response: {response}, wanted SimResponse.DONE"
			)

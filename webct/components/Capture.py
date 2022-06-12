from dataclasses import dataclass
from typing import Tuple

import numpy as np

@dataclass(frozen=True)
class CaptureParameters:
	projections: int # Number of projections around an object.
	capture_angle: int # Total rotation around the sample in degrees.
	detector_position: Tuple[float, float, float]
	beam_position: Tuple[float, float, float]
	sample_rotation: Tuple[float, float, float]

	@property
	def angles(self) -> np.ndarray:
		angles = np.linspace(0, 1, self.projections)
		return angles * self.capture_angle

	@property
	def angle_delta(self) -> np.ndarray:
		return self.capture_angle / self.projections

	@staticmethod
	def from_json(json: dict):
		if (
			"projections" not in json
			or "capture_angle" not in json
			or "beam_position" not in json
			or "detector_position" not in json
			or "sample_rotation" not in json
		):
			raise ValueError("Missing keys.")

		int(json["projections"])
		int(json["capture_angle"])
		tuple(json["beam_position"])
		tuple(json["detector_position"])
		tuple(json["sample_rotation"])

		# Number of projections
		projections = int(json["projections"])
		if projections > 2000:
			raise ValueError("Number of projections must be less than 3000.")
		elif projections < 2:
			raise ValueError("Number of projections must be 2 or larger.")

		# Total angle of capture
		capture_angle = int(json["capture_angle"])
		if capture_angle != 180 and capture_angle != 360:
			raise ValueError("Total angle of capture must be 180, or 360 degrees.")

		# Detector Position
		detector_pos = tuple(json["detector_position"])
		if len(detector_pos) != 3:
			raise ValueError(f"Detector Position must contain three axis. ({len(detector_pos)} was given).")
		detector_pos = [float(x) for x in detector_pos]

		# Source Position
		beam_pos = tuple(json["beam_position"])
		if len(beam_pos) != 3:
			raise ValueError(f"Beam Position must contain three axis. ({len(beam_pos)} was given).")
		beam_pos = [float(x) for x in beam_pos]

		# Sample Rotation
		sample_rot = tuple(json["sample_rotation"])
		if len(sample_rot) != 3:
			raise ValueError(f"Sample rotation must contain three axis. ({len(sample_rot)} was given).")
		sample_rot = [float(x) for x in sample_rot]

		return CaptureParameters(
			projections=projections,
			capture_angle=capture_angle,
			detector_position=detector_pos,
			beam_position=beam_pos,
			sample_rotation=sample_rot,
		)

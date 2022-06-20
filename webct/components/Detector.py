from dataclasses import dataclass
from typing import Tuple


@dataclass(frozen=True)
class DetectorParameters:
	pane_width: float  # width of pane in mm
	pane_height: float  # height of pane in mm
	pixel_size: float  # size of pixels in mm
	psf: None  # Point spread function
	energy_response: None  # Energy response function

	@property
	def shape(self) -> Tuple[int, int]:
		return tuple(
			int(t / self.pixel_size) for t in (self.pane_height, self.pane_width)
		)

	@staticmethod
	def from_json(json: dict):
		if (
			"pane_width" not in json
			or "pane_height" not in json
			or "pixel_size" not in json
		):
			raise ValueError("Missing keys.")

		float(json["pane_width"])
		float(json["pane_height"])
		int(json["pixel_size"])

		# Pane Width
		pane_width = float(json["pane_width"])
		if pane_width > 10000:
			raise ValueError("Pane width must be less than 10000mm.")
		elif pane_width == 0 or pane_width < 0:
			raise ValueError("Pane width cannot be 0 or less.")

		# Pane Height
		pane_height = float(json["pane_height"])
		if pane_height > 10000:
			raise ValueError("Pane height must be less than 10000mm.")
		elif pane_height == 0 or pane_height < 0:
			raise ValueError("Pane height cannot be 0 or less.")

		# Pixel Size
		pixel_size = float(json["pixel_size"])
		if pixel_size > 10000:
			raise ValueError("Pixel size must be less than 100mm.")
		elif pixel_size == 0 or pixel_size < 0.0001:
			raise ValueError("Pixel size cannot be 0 or less.")

		return DetectorParameters(
			pane_height=pane_height,
			pane_width=pane_width,
			pixel_size=pixel_size,
			energy_response=None,
			psf=None,
		)

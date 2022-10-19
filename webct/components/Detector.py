from dataclasses import dataclass
import math
from typing import List, Optional, Tuple
import numpy as np
from scipy import ndimage


@dataclass(frozen=True)
class DetectorParameters:
	pane_width: float  # width of pane in mm
	pane_height: float  # height of pane in mm
	pixel_size: float  # size of pixels in mm
	lsf: Optional[List[float]]  # Point spread function
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

		# lsf/psf
		lsf:List[float]= DEFAULT_LSF
		if "lsf" in json:
			lsf = list(np.asarray(json["lsf"], dtype=float))

		return DetectorParameters(
			pane_height=pane_height,
			pane_width=pane_width,
			pixel_size=pixel_size,
			lsf=lsf,
			energy_response=None,
		)

def _lsf(x:np.ndarray, b2 = 54.9359, c2 = -3.58452, e2 = 6.32561e+09, f2 = 1.0):
	temp_1 = (2.0 / (math.sqrt(math.pi) * e2 * f2)) * np.exp(-np.square(x) / (e2 * e2))
	temp_2 = 1.0 / (b2 * c2) * np.power(1 + np.square(x) / (b2 * b2), -1)
	temp_3 = np.power(2.0 / f2 + math.pi / c2, -1)
	value = (temp_1 + temp_2) * temp_3

	return value

def get() -> np.ndarray:
	t = np.arange(-20., 21., 1.)

	lsf_kernel = _lsf(t * 41) / _lsf(np.zeros(1))
	lsf_kernel /= lsf_kernel.sum()
	return lsf_kernel

if __name__ == "__main__":
	print(get())

DEFAULT_LSF = [0.00110698, 0.00122599, 0.00136522, 0.00152954, 0.00172533, 0.00196116,
               0.0022487,  0.00260419, 0.00305074, 0.00362216, 0.00436939, 0.00537209,
               0.00676012, 0.0087564,  0.01176824, 0.01659933, 0.02499446, 0.04120158,
               0.0767488,  0.15911699, 0.24774516, 0.15911699, 0.0767488,  0.04120158,
               0.02499446, 0.01659933, 0.01176824, 0.0087564,  0.00676012, 0.00537209,
               0.00436939, 0.00362216, 0.00305074, 0.00260419, 0.0022487,  0.00196116,
               0.00172533, 0.00152954, 0.00136522, 0.00122599, 0.00110698]

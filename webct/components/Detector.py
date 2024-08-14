from copy import copy
from dataclasses import dataclass
from enum import Enum, unique
import math
from typing import List, Optional, Tuple
import numpy as np
from scipy import ndimage

# gvxr is only used in this context for scintillator properties.
# Do not initialize the simulator in this context.
from gvxrPython3 import gvxr

@dataclass(frozen=True)
class EnergyResponse():
	incident: tuple  # Input energies into scintillator [keV]
	output: tuple    # Output energies from scintillator [keV]

	@property
	def asTuple(self):
		return tuple(zip(self.incident, self.output))

@dataclass(frozen=True)
class Spectra:
	energies: tuple  # Array of energies in a spectrum [keV]
	photons: tuple  # Array of photons [Normalised]
	kerma: float  # Air Kerma calculated from spectrum [uGy]
	flu: float  # Fluence of spectrum [Photons cm^-2 mAs^-1]
	emean: float  # Mean energy of spectrum [keV]


@unique
class SCINTILLATOR_MATERIAL(str, Enum):
	NONE = ""
	CUSTOM = "CUSTOM"
	CSI = "CsI"
	NAI = "NaI"
	GADOX = "Gadox"
	GADOX_DRZ_PLUS = "Gadox DRZ-Plus"
	GD2O3 = "Gd2O3"
	GD3GA5O12 = "Gd3Ga5O12"
	Y2GD203 = "YGO"
	CDW04 = "CdWO4"
	Y203 = "Y2O3"
	LA2HF07 = "La2HfO7"
	Y3AL5O12 = "Y3Al5O12"

@dataclass(frozen=True)
class Scintillator:
	material: SCINTILLATOR_MATERIAL
	thickness: float
	custom_response: Optional[EnergyResponse] = None

	@property
	def isCustom(self) -> bool:
		return self.material == SCINTILLATOR_MATERIAL.CUSTOM

	@property
	def response(self) -> EnergyResponse:
		if self.material != SCINTILLATOR_MATERIAL.NONE:
			incident_output = gvxr.getEnergyResponse(self.material.value, self.thickness, "mm", "keV")
			return EnergyResponse(
				incident=tuple([x[0] for x in incident_output]),
				output=tuple([x[1] for x in incident_output])
				)
		else:
			# Perfect linear response if no detector energy response
			return EnergyResponse(tuple(np.arange(0, 300, dtype=float)), tuple(np.arange(0, 300, dtype=float)))

	@staticmethod
	def from_json(json: dict):
		if (
			"material" not in json
			or "thickness" not in json
		):
			raise ValueError("Missing keys.")

		thickness = float(json["thickness"])
		if thickness <= 0:
			raise ValueError("Thickness cannot be less than 0")

		material = SCINTILLATOR_MATERIAL(str(json["material"]))

		custom_response = None
		if material == SCINTILLATOR_MATERIAL.CUSTOM:
			if "custom_response" not in json:
				raise ValueError("Missing key for custom energy response.")

			incident = json["custom_response"]["incident"]
			output = json["custom_response"]["output"]

			# coerce all inputs to float
			incident = tuple([float(x) for x in incident])
			output = tuple([float(x) for x in output])

			custom_response = EnergyResponse(
				incident=incident,
				output=output)

		return Scintillator(
			material=material,
			thickness=thickness,
			custom_response=custom_response
		)

	def to_json(self) -> dict:
		return copy(self.__dict__)


@dataclass(frozen=True)
class DetectorParameters:
	pane_width: float  # width of pane in mm
	pane_height: float  # height of pane in mm
	pixel_size: float  # size of pixels in mm
	lsf: Optional[List[float]]  # Point spread function
	scintillator: Scintillator # Scintillator

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

		# Scintillator
		scintillator = Scintillator.from_json(json["scintillator"])

		return DetectorParameters(
			pane_height=pane_height,
			pane_width=pane_width,
			pixel_size=pixel_size,
			lsf=lsf,
			scintillator=scintillator,
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

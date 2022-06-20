"""Beam generator for WebCT"""

from dataclasses import dataclass
from typing import List, Tuple
from webct import Element
from enum import Enum
from enum import unique

# Type aliases
KeV = float
mm = float
Degrees = float


@unique
class PROJECTION(str, Enum):
	"""Represents a beam projection type.

	Enums:
		POINT: A projection from a point source
		PARALLEL: A uniform parallel projection
	"""

	POINT = "point"
	PARALLEL = "parallel"


@unique
class BEAM_GENERATOR(str, Enum):
	SPEKPY = "spekpy"
	XPECGEN = "xpecgen"


@dataclass(frozen=True)
class Filter:
	filterElement: Element
	filterThickness: mm


def parseFilters(pfilters: List[dict]) -> Tuple[Filter, ...]:
	filters: List[Filter] = []
	for potential in pfilters:
		filterElement = Element(int(potential["filterElement"]))
		filterThickness = float(potential["filterThickness"])
		filters.append(Filter(filterElement, filterThickness))
	return tuple(filters)


@dataclass(frozen=True)
class BeamParameters:
	electron_energy: KeV
	emission_angle: Degrees
	source_material: Element
	filters: Tuple[Filter, ...]
	projection: PROJECTION
	generator: BEAM_GENERATOR

	def to_json(self) -> dict:
		return self.__dict__

	@staticmethod
	def from_json(json: dict):

		if (
			"electron_energy" not in json
			or "emission_angle" not in json
			or "source_material" not in json
			or "generator" not in json
			or "filters" not in json
			or "projection" not in json
		):
			raise ValueError("Missing keys.")

		float(json["electron_energy"])
		float(json["emission_angle"])
		int(json["source_material"])
		str(json["generator"])
		dict(json["filters"])
		str(json["projection"])

		# Source Element
		source_material = int(json["source_material"])
		source_material = Element(source_material)

		if source_material is None:
			raise ValueError(f"Unknown material type {source_material}")
		if source_material != Element.W and source_material != Element.Rh and source_material != Element.Mo:
			raise ValueError(f"Unsupported Element type {source_material} only W, Rh, and Mo are supported.")

		# Tube Voltage
		electron_energy = float(json["electron_energy"])
		if (source_material == Element.W):
			if electron_energy > 300:
				raise ValueError("Electron energy is too high for W (300keV max)")
			elif electron_energy < 30:
				raise ValueError("Electron energy is too low for W (30keV min)")
		elif (source_material == Element.Rh or source_material == Element.Mo):
			if electron_energy > 50:
				raise ValueError("Electron energy is too high. (50keV max)")
			elif electron_energy < 20:
				raise ValueError("Electron energy is too low. (20keV min)")
		else:
			raise ValueError(f"Unsupported Element type {source_material} only W, Rh, and Mo are supported.")

		# Emission Angle
		emission_angle = float(json["emission_angle"])
		if emission_angle > 360:
			raise ValueError("Emission angle must be less than 360 degrees.")
		elif emission_angle == 0 or emission_angle < 0:
			raise ValueError("Emission cannot be 0 or less.")

		# Generator
		generator = BEAM_GENERATOR(json["generator"])

		# Filters
		filters = parseFilters(json["filters"])

		# projection
		projection = PROJECTION(json["projection"])

		return BeamParameters(
			electron_energy=electron_energy,
			emission_angle=emission_angle,
			source_material=source_material,
			projection=projection,
			filters=filters,
			generator=generator
		)


@dataclass(frozen=True)
class Spectra:
	energies: tuple  # Array of energies in a spectrum [keV]
	photons: tuple  # Array of photons [Normalised]
	kerma: float  # Air Kerma calculated from spectrum [uGy]
	flu: float  # Fluence of spectrum [Photons cm^-2 mAs^-1]
	emean: float  # Mean energy of spectrum [keV]

	# hvl_1_al:float		# First half value layer of Al [mmAl]
	# hvl_2_al:float		# Second half value layer of Al [mmAl]
	# hc_al:float			# Homogeneity coefficient of Al
	# eeff_al:float		# Effective energy of Al [keV]

	# hvl_1_cu:float		# First half value layer of Cu [mmCu]
	# hvl_2_cu:float		# Second half value layer of Cu [mmCu]
	# hc_cu:float			# Homogeneity coefficient of Cu
	# eeff_cu:float		# Effective energy of Cu [keV]


@dataclass(frozen=True)
class Beam:
	params: BeamParameters
	spectra: Spectra

"""Beam generator for WebCT"""

from dataclasses import dataclass
from functools import cache
from typing import List, Literal, Tuple, Union, cast
from webct import Element
from enum import Enum
from enum import unique
import math
import spekpy as sp
import xpecgen.xpecgen as xp
import numpy as np

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
class Beamparameters:
	method: str
	filters: List[Filter]
	projection: PROJECTION

@dataclass(frozen=True)
class LabBeam(Beamparameters):
	method = "lab"
	projection = PROJECTION.POINT
	voltage: float
	exposure: float
	intensity: float
	spotSize: float
	anodeAngle: float
	generator: BEAM_GENERATOR

@dataclass(frozen=True)
class SynchBeam(Beamparameters):
	method = "synch"
	projection = PROJECTION.PARALLEL
	energy: float
	exposure: float
	intensity: float
	harmonics: bool

class MedBeam(Beamparameters):
	method = "med"
	projection = PROJECTION.POINT
	voltage: float
	mas: float

@dataclass(frozen=True)
class Spectra:
	energies: tuple  # Array of energies in a spectrum [keV]
	photons: tuple  # Array of photons [Normalised]
	kerma: float  # Air Kerma calculated from spectrum [uGy]
	flu: float  # Fluence of spectrum [Photons cm^-2 mAs^-1]
	emean: float  # Mean energy of spectrum [keV]

@dataclass(frozen=True)
class Beam:
	params: Beamparameters
	spectra: Spectra

@dataclass(frozen=True)
class LSF:
	kernel: np.ndarray

	def to_json(self) -> dict:
		return self.__dict__

	@staticmethod
	def from_json(json: dict):
		return LSF(np.zeros(0))

	# @staticmethod
	# def _lsf(x:np.ndarray, b2 = 54.9359, c2 = -3.58452, e2 = 6.32561e+09, f2 = 1.0):
	# 	temp_1 = (2.0 / (math.sqrt(math.pi) * e2 * f2)) * np.exp(-np.square(x) / (e2 * e2))
	# 	temp_2 = 1.0 / (b2 * c2) * np.power(1 + np.square(x) / (b2 * b2), -1)
	# 	temp_3 = np.power(2.0 / f2 + math.pi / c2, -1)
	# 	value = (temp_1 + temp_2) * temp_3

	# 	return value

	# def get(self) -> np.ndarray:
	# 	t = np.arange(-20., 21., 1.)

	# 	lsf_kernel = self._lsf(t * 41) / self._lsf(np.zeros(1))
	# 	lsf_kernel /= lsf_kernel.sum()
	# 	return lsf_kernel

@cache
def generateSpectra(beam: Beamparameters) -> Tuple[Spectra, Spectra]:

	if beam.method == "synch":
		params = cast(SynchBeam, beam)
		# harmonics are two higher order;
		total_range = int(params.energy * 3 + 10)

		energies = np.arange(0, total_range)
		photons = np.zeros(total_range)

		photons[params.energy] = 1000
		if params.harmonics:
			# Add higher-order harmonics
			photons[params.energy*2] = 30
			photons[params.energy*3] = 10

	elif beam.method == "lab":
		params = cast(LabBeam, beam)
		...

	if beam.generator == BEAM_GENERATOR.SPEKPY:
		spec = sp.Spek(
			kvp=beam.electron_energy,
			th=beam.emission_angle,
			targ=Element(beam.source_material).name,
		)
		results = spec.get_std_results()

		for filter in beam.filters:
			spec = spec.filter(filter.filterElement.name, filter.filterThickness)

		return (
			Spectra(
				energies=tuple(spec.get_k()),
				photons=tuple(spec.get_spk()),
				kerma=spec.get_kerma(),
				flu=spec.get_flu(),
				emean=spec.get_emean(),
			),
			Spectra(
				# Not really sure if these are useful?
				energies=tuple(results.k),
				photons=tuple(results.spk),
				kerma=results.kerma,
				flu=results.flu,
				emean=results.emean,
			),
		)
	elif beam.generator == BEAM_GENERATOR.XPECGEN:
		xpspec = xp.calculate_spectrum(
			beam.electron_energy,
			beam.emission_angle,
			3,
			int(beam.electron_energy * 2),
			z=beam.source_material.value,
		)
		unfiltered = Spectra(
			energies=tuple(xpspec.x),
			photons=tuple(xpspec.y),
			kerma=-1,
			flu=-1,
			emean=-1,
		)
		for filter in beam.filters:
			xpspec.attenuate(
				filter.filterThickness * 10, xp.get_mu(filter.filterElement.value)
			)
		filtered = Spectra(
			energies=tuple(xpspec.x),
			photons=tuple(xpspec.y),
			kerma=-1,
			flu=-1,
			emean=-1,
		)
		return (unfiltered, filtered)
	else:
		raise NotImplementedError("Other beam spectra generators are not implemented.")


class spectraGenerator:

	@staticmethod
	def generate()

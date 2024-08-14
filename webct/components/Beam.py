"""Beam generator for WebCT"""

from dataclasses import dataclass
from functools import cache
from typing import List, Tuple, cast
from webct import Element
from enum import Enum
from enum import unique
import spekpy as sp
import xpecgen.xpecgen as xp
import numpy as np

# Type aliases
KeV = float
mm = float
Degrees = float

@dataclass(frozen=True)
class Spectra:
	energies: tuple  # Array of energies in a spectrum [keV]
	photons: tuple  # Array of photons [Normalised]
	kerma: float  # Air Kerma calculated from spectrum [uGy]
	flu: float  # Fluence of spectrum [Photons cm^-2 mAs^-1]
	emean: float  # Mean energy of spectrum [keV]

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
	material: Element
	thickness: mm

	@staticmethod
	def from_json(json:dict):
		filterElement = Element(int(json["material"]))
		filterThickness = float(json["thickness"])
		return Filter(filterElement, filterThickness)


def parseFilters(pfilters: List[dict]) -> Tuple[Filter, ...]:
	filters: List[Filter] = []
	for potential in pfilters:
		filters.append(Filter.from_json(potential))
	return tuple(filters)


@dataclass(frozen=True)
class BeamParameters:
	method: str
	filters: Tuple[Filter, ...]
	projection: PROJECTION
	spotSize:float


	def to_json(self) -> dict:
		return self.__dict__

	@staticmethod
	def from_json(json:dict):
		method = str(json["method"])
		filters = parseFilters(json["filters"])
		projection = PROJECTION(json["projection"])
		spotSize = float(json["spotSize"])

		return BeamParameters(method, filters, projection, spotSize)

	def getSpectra(self) -> Tuple[Spectra, Spectra]:
		raise NotImplementedError("Cannot create a beam spectra from BeamParamaters.")

@dataclass(frozen=True)
class TubeBeam():
	voltage: float
	anodeAngle: float
	generator: BEAM_GENERATOR
	material: Element

@dataclass(frozen=True)
class LabBeam(BeamParameters, TubeBeam):
	method = "lab"
	projection = PROJECTION.POINT
	exposure: float # s
	intensity: float # uA

	@property
	def mas(self)->float:
		return self.exposure * ( self.intensity / 1000 )

	def to_json(self) -> dict:
		return self.__dict__

	@staticmethod
	def from_json(json:dict):
		voltage = float(json["voltage"])
		exposure = float(json["exposure"])
		intensity = float(json["intensity"])
		spotSize = float(json["spotSize"])
		anodeAngle = float(json["anodeAngle"])
		generator = BEAM_GENERATOR(str(json["generator"]))
		material = Element(int(json["material"]))

		filters = parseFilters(json["filters"])

		return LabBeam(
			method="lab",
			projection=PROJECTION.POINT,
			filters=filters,
			voltage=voltage,
			exposure=exposure,
			intensity=intensity,
			spotSize=spotSize,
			anodeAngle=anodeAngle,
			generator=generator,
			material=material)

	def getSpectra(self) -> Tuple[Spectra, Spectra]:
		return generateSpectra(self)

@dataclass(frozen=True)
class MedBeam(BeamParameters, TubeBeam):
	method = "med"
	projection = PROJECTION.POINT
	mas: float

	def to_json(self) -> dict:
		return self.__dict__

	@staticmethod
	def from_json(json:dict):
		voltage = float(json["voltage"])
		mas = float(json["mas"])

		spotSize = float(json["spotSize"])
		anodeAngle = float(json["anodeAngle"])
		generator = BEAM_GENERATOR(str(json["generator"]))
		material = Element(int(json["material"]))
		filters = parseFilters(json["filters"])

		# How to obtain exposure and intensity from mAs?
		intensity=1
		exposure=1

		return MedBeam(method="med",
			projection=PROJECTION.POINT,
			filters=filters,
			voltage=voltage,
			mas=mas,
			spotSize=spotSize,
			anodeAngle=anodeAngle,
			generator=generator,
			material=material)

	def getSpectra(self) -> Tuple[Spectra, Spectra]:
		return generateSpectra(self)

@dataclass(frozen=True)
class SynchBeam(BeamParameters):
	method = "synch"
	projection = PROJECTION.PARALLEL
	energy: float
	exposure: float
	flux: float
	harmonics: bool

	def to_json(self) -> dict:
		return self.__dict__

	@staticmethod
	def from_json(json:dict):
		energy = float(json["energy"])
		exposure = float(json["exposure"])
		flux = float(json["flux"])
		harmonics = bool(json["harmonics"])

		filters = parseFilters(json["filters"])

		return SynchBeam(
		method="synch",
		projection=PROJECTION.PARALLEL,
		filters=filters,
		energy=energy,
		exposure=exposure,
		flux=flux,
		harmonics=harmonics,
		spotSize=0)

	def getSpectra(self) -> Tuple[Spectra, Spectra]:
		return generateSpectra(self)

def BeamFromJson(json:dict) -> BeamParameters:
	if "method" not in json:
		raise KeyError("No method key found.")

	if json["method"] == "lab":
		return LabBeam.from_json(json)
	elif json["method"] == "med":
		return MedBeam.from_json(json)
	elif json["method"] == "synch":
		return SynchBeam.from_json(json)
	else:
		raise NotImplementedError(f"Method '{json['method']}' is not implemented")
@dataclass(frozen=True)
class Beam:
	params: BeamParameters
	spectra: Spectra

@cache
def generateSpectra(beam: BeamParameters) -> Tuple[Spectra, Spectra]:
	if beam.method == "synch":
		params = cast(SynchBeam, beam)
		# harmonics are two higher order;
		total_range = int(params.energy * 3 + 10)
		flux = params.flux * 10e10

		energies = np.arange(0, total_range, dtype=int)
		photons = np.zeros(total_range)
		base_energy = int(params.energy)
		photons[base_energy] = flux
		if params.harmonics:
			# Add higher-order harmonics
			photons[base_energy*3] = photons[base_energy] * 0.01
			photons[base_energy*2] = photons[base_energy] * 0.03
			photons[base_energy] = flux * 0.96

		return (Spectra(
			tuple(energies.astype(float)),
			tuple(photons.astype(float)),
			0,
			0,
			0),

			# ! Synchatron beam does not currently support filters.
			Spectra(
			tuple(energies.astype(float)),
			tuple(photons.astype(float)),
			0,
			0,
			0),
			)

	elif beam.method == "lab" or beam.method == "med":
		params = cast(LabBeam, beam) if beam.method == "lab" else cast(MedBeam, beam)

		if params.generator == BEAM_GENERATOR.SPEKPY:
			spec = sp.Spek(
			kvp=params.voltage,
			th=params.anodeAngle,
			targ=params.material.name,
			mas=params.mas
			)
			results = spec.get_std_results()

			for filter in beam.filters:
				spec = spec.filter(filter.material.name, filter.thickness)

			return (
				Spectra(
					energies=tuple(spec.get_k()),
					photons=tuple(spec.get_spk()),
					kerma=spec.get_kerma(),
					flu=spec.get_flu(),
					emean=spec.get_emean(),
				),
				Spectra(
					energies=tuple(results.k),
					photons=tuple(results.spk),
					kerma=results.kerma,
					flu=results.flu,
					emean=results.emean,
				))
		elif params.generator == BEAM_GENERATOR.XPECGEN:
			# Generate a spectrum
			unfiltered = xp.calculate_spectrum(params.voltage, params.anodeAngle, 1, 200, epsrel=0.5, monitor=None, z=params.material.value)

			#Inherent filtration: 1.2mm Al
			# mu_Al = xp.get_mu(Element.Al.value)
			# unfiltered.attenuate(0.12, mu_Al)

			# Apply filters
			filtered = unfiltered.clone()
			for filter in params.filters:
				filtered.attenuate(filter.thickness / 10, xp.get_mu(filter.material.value))


			(filter_energies,filter_count) = filtered.get_points()
			(unfiltered_energies,unfiltered_count) = unfiltered.get_points()

			return (
				Spectra(
					energies=tuple([float(f'{x:.4}') for x in filter_energies]),
					photons=tuple([float(f'{x:.4}') for x in filter_count]),
					kerma=0,
					flu=0,
					emean=0,
				),
				Spectra(
					energies=tuple([float(f'{x:.4}') for x in unfiltered_energies]),
					photons=tuple([float(f'{x:.4}') for x in unfiltered_count]),
					kerma=0,
					flu=0,
					emean=0,
				))

			raise NotImplementedError("XPECGEN is currently not implemented.")
		else:
			raise NotImplementedError("Other beam spectra generators are not implemented.")
	else:
		raise ValueError("Unsupported beam type.")

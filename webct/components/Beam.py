"""Beam generator for WebCT"""

import logging as log
from dataclasses import dataclass
from enum import Enum, unique
from functools import cache
from typing import cast

import numpy as np
import spekpy as sp
import xpecgen.xpecgen as xp
from gvxrPython3 import gvxr
from gvxrPython3.twins import DigitalTwin, TwinBeamFixedSpectrum, TwinBeamMonochromatic

from webct import Element
from webct.components.Twin import get_twin

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
	STATIC = "static"
	XRAY_PHYSICS = "xrayphysics"
	MONOCHROMATIC = "monochromatic"


@dataclass(frozen=True)
class Filter:
	material: Element
	thickness: mm

	@staticmethod
	def from_json(json: dict):
		filterElement = Element(int(json["material"]))
		filterThickness = float(json["thickness"])
		return Filter(filterElement, filterThickness)


def parseFilters(pfilters: list[dict]) -> tuple[Filter, ...]:
	filters: list[Filter] = []
	for potential in pfilters:
		filters.append(Filter.from_json(potential))
	return tuple(filters)


@dataclass(frozen=True)
class BeamParameters:
	twin: str
	twin_beam: str
	method: str
	filters: tuple[Filter, ...]
	projection: PROJECTION
	spotSize: float
	enableNoise: bool
	generator: BEAM_GENERATOR

	def to_json(self) -> dict:
		return self.__dict__

	@staticmethod
	def from_json(json: dict):
		twin = str(json["twin"])
		if twin == "":
			twin = "None"
		twin_beam = str(json["twin_beam"])
		method = str(json["method"])
		filters = parseFilters(json["filters"])
		projection = PROJECTION(json["projection"])
		spotSize = float(json["spotSize"])
		enableNoise = bool(json["enableNoise"])
		generator = BEAM_GENERATOR(str(json["generator"]))

		return BeamParameters(twin, twin_beam, method, filters, projection, spotSize, enableNoise, generator)

	def getSpectra(self) -> tuple[Spectra, Spectra]:
		raise NotImplementedError("Cannot create a beam spectra from BeamParamaters.")


@dataclass(frozen=True)
class TubeBeam:
	voltage: float
	anodeAngle: float
	material: Element


@dataclass(frozen=True)
class LabBeam(BeamParameters, TubeBeam):
	method = "lab"
	projection = PROJECTION.POINT
	exposure: float  # s
	intensity: float  # uA

	@property
	def mas(self) -> float:
		return self.exposure * (self.intensity / 1000)

	def to_json(self) -> dict:
		return self.__dict__

	@staticmethod
	def from_json(json: dict):
		twin = str(json["twin"])
		twin_beam = str(json["twin_beam"])
		voltage = float(json["voltage"])
		enableNoise = bool(json["enableNoise"])
		exposure = float(json["exposure"])
		intensity = float(json["intensity"])
		spotSize = float(json["spotSize"])
		anodeAngle = float(json["anodeAngle"])
		material = Element(int(json["material"]))

		filters = parseFilters(json["filters"])
		generator = BEAM_GENERATOR(str(json["generator"]))

		return LabBeam(
			twin=twin,
			twin_beam=twin_beam,
			method="lab",
			enableNoise=enableNoise,
			projection=PROJECTION.POINT,
			filters=filters,
			voltage=voltage,
			exposure=exposure,
			intensity=intensity,
			spotSize=spotSize,
			anodeAngle=anodeAngle,
			material=material,
			generator=generator,
		)

	def getSpectra(self) -> tuple[Spectra, Spectra]:
		return generateSpectra(self)


@dataclass(frozen=True)
class MedBeam(BeamParameters, TubeBeam):
	method = "med"
	projection = PROJECTION.POINT
	mas: float

	def to_json(self) -> dict:
		return self.__dict__

	@staticmethod
	def from_json(json: dict):
		twin = str(json["twin"])
		twin_beam = str(json["twin_beam"])
		voltage = float(json["voltage"])
		mas = float(json["mas"])
		enableNoise = bool(json["enableNoise"])
		spotSize = float(json["spotSize"])
		anodeAngle = float(json["anodeAngle"])
		material = Element(int(json["material"]))
		filters = parseFilters(json["filters"])
		generator = BEAM_GENERATOR(str(json["generator"]))

		# How to obtain exposure and intensity from mAs?
		intensity = 1
		exposure = 1

		return MedBeam(
			twin=twin,
			twin_beam=twin_beam,
			method="med",
			projection=PROJECTION.POINT,
			enableNoise=enableNoise,
			filters=filters,
			voltage=voltage,
			mas=mas,
			spotSize=spotSize,
			anodeAngle=anodeAngle,
			material=material,
			generator=generator,
		)

	def getSpectra(self) -> tuple[Spectra, Spectra]:
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
	def from_json(json: dict):
		twin = str(json["twin"])
		twin_beam = str(json["twin_beam"])
		energy = float(json["energy"])
		enableNoise = bool(json["enableNoise"])
		exposure = float(json["exposure"])
		flux = float(json["flux"])
		harmonics = bool(json["harmonics"])

		filters = parseFilters(json["filters"])
		generator = BEAM_GENERATOR(str(json["generator"]))

		return SynchBeam(
			twin=twin,
			twin_beam=twin_beam,
			method="synch",
			projection=PROJECTION.PARALLEL,
			enableNoise=enableNoise,
			filters=filters,
			energy=energy,
			exposure=exposure,
			flux=flux,
			harmonics=harmonics,
			spotSize=0,
			generator=generator,
		)

	def getSpectra(self) -> tuple[Spectra, Spectra]:
		return generateSpectra(self)


@dataclass(frozen=True)
class TwinBeam(BeamParameters):
	flux: float


@dataclass(frozen=True)
class TwinSynchBeam(TwinBeam, SynchBeam): ...


@dataclass(frozen=True)
class TwinTubeBeam(TwinBeam, TubeBeam): ...


def BeamFromJson(json: dict) -> BeamParameters:
	if "method" not in json:
		raise KeyError("No method key found.")

	if json["method"] == "lab":
		return LabBeam.from_json(json)
	if json["method"] == "med":
		return MedBeam.from_json(json)
	if json["method"] == "synch":
		return SynchBeam.from_json(json)
	raise NotImplementedError(f"Method '{json['method']}' is not implemented")


@dataclass(frozen=True)
class Beam:
	params: BeamParameters
	spectra: Spectra


@cache
def generateSpectra(beam: BeamParameters) -> tuple[Spectra, Spectra]:
	if beam.generator == BEAM_GENERATOR.STATIC:
		twin: DigitalTwin | None = get_twin(beam.twin)
		if twin is None:
			raise ValueError(
				f"Static spectra must have a digital twin, but unable to find twin with name '{twin.specification.name}'",
			)

		if beam.twin_beam not in twin.get_beams():
			raise KeyError(f"Beam of name '{beam.twin_beam}' does not exist in twin '{twin.specification.name}'")

		twinbeam = twin.specification.beams[beam.twin_beam]

		if isinstance(twinbeam, TwinBeamFixedSpectrum):
			unfiltered = Spectra(
				[x[0] for x in twinbeam.spectrum], [x[1] for x in twinbeam.spectrum], 0, 0, 0
			)

			gvxr.resetBeamSpectrum()
			for energy, photons in twinbeam.spectrum:
				gvxr.addEnergyBinToSpectrumPerCm2At1m(energy, "keV", photons)

			# internal filtration is already handled by the beam characteristics
			for f in beam.filters:
				gvxr.addFilter(f.material, f.thickness, "mm")

			filtered_bins = gvxr.getEnergyBins("keV")
			filtered_photons = gvxr.getPhotonCountsPerCm2At1m()
			filtered = Spectra(filtered_bins, filtered_photons, 0, 0, 0)

			return (filtered, unfiltered)

	if beam.generator == BEAM_GENERATOR.MONOCHROMATIC:
		log.info("Generating monochromatic beam spectra")
		params = cast("SynchBeam", beam)
		# harmonics are two higher order;
		total_range = int(params.energy * 3 + 10)
		flux = params.flux * 10e10

		energies = np.arange(0, total_range, dtype=int)
		photons = np.zeros(total_range)
		base_energy = int(params.energy)
		photons[base_energy] = flux
		if params.harmonics:
			# Add higher-order harmonics
			photons[base_energy * 3] = photons[base_energy] * 0.01
			photons[base_energy * 2] = photons[base_energy] * 0.03
			photons[base_energy] = flux * 0.96

		return (
			Spectra(tuple(energies.astype(float)), tuple(photons.astype(float)), 0, 0, 0),
			# ! Synchatron beam does not currently support filters.
			Spectra(tuple(energies.astype(float)), tuple(photons.astype(float)), 0, 0, 0),
		)

	if beam.generator in {BEAM_GENERATOR.SPEKPY, BEAM_GENERATOR.XPECGEN, BEAM_GENERATOR.XRAY_PHYSICS}:
		if beam.method not in {"lab", "med"}:
			raise ValueError("Spekpy, Xpecgen, and Xrayphysics only support tube sources.")

		params = cast("LabBeam", beam) if beam.method == "lab" else cast("MedBeam", beam)
		log.info(f"Generating Tube beam spectra with {params.generator}")

		if params.generator == BEAM_GENERATOR.SPEKPY:
			spec = sp.Spek(
				kvp=params.voltage,
				th=params.anodeAngle,
				dk=1,
				targ=params.material.name,
				mas=params.mas,
				shift=0.5,
			)
			results = spec.get_std_results()

			for f in beam.filters:
				spec = spec.filter(f.material.name, f.thickness)

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
				),
			)

		if params.generator == BEAM_GENERATOR.XPECGEN:
			# Generate a spectrum
			unfiltered = xp.calculate_spectrum(
				params.voltage,
				params.anodeAngle,
				1,
				200,
				epsrel=0.5,
				monitor=None,
				z=params.material.value,
			)

			# Inherent filtration: 1.2mm Al
			# mu_Al = xp.get_mu(Element.Al.value)
			# unfiltered.attenuate(0.12, mu_Al)

			# Apply filters
			filtered = unfiltered.clone()
			for f in params.filters:
				filtered.attenuate(f.thickness / 10, xp.get_mu(f.material.value))

			(filter_energies, filter_count) = filtered.get_points()
			(unfiltered_energies, unfiltered_count) = unfiltered.get_points()

			return (
				Spectra(
					energies=tuple([float(f"{x:.4}") for x in filter_energies]),
					photons=tuple([float(f"{x:.4}") for x in filter_count]),
					kerma=0,
					flu=0,
					emean=0,
				),
				Spectra(
					energies=tuple([float(f"{x:.4}") for x in unfiltered_energies]),
					photons=tuple([float(f"{x:.4}") for x in unfiltered_count]),
					kerma=0,
					flu=0,
					emean=0,
				),
			)

		if params.generator == BEAM_GENERATOR.XRAY_PHYSICS:
			# xray physics is now the default in gvxr
			# gvxr.resetBeamSpectrum()
			# gvxr.setmAs()
			# gvxr.setFiltration()
			# gvxr.setVoltage()

			raise NotImplementedError("Xray physics is currently not implemented.")

		raise NotImplementedError("Other beam spectra generators are not implemented.")

	raise ValueError("Unsupported beam type.")

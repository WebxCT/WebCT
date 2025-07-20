from __future__ import annotations

from dataclasses import dataclass
from enum import Enum, unique
from pathlib import Path
from typing import Literal

import json5

TWINS = {}

# ======================================================== #

@unique
class PROJECTION(str, Enum):
	"""Represents a beam projection type.

	Enums:
		POINT: A projection from a point source
		PARALLEL: A uniform parallel projection
	"""

	POINT = "point"
	PARALLEL = "parallel"



@dataclass(kw_only=True)
class TwinFlux:
	"""Representes calibrated digital twin flux for representative noise of a beam-detector pair, linked to voltage or energy."""

	# Twin flux curve parameters for use in np.polyval at 1mas per [cm2] at distance [mm]
	curve: list[float]

	# Distance in mm of curve, standard units would be 1000 for flux @ 1m.
	distance: float

	def to_json(self) -> dict:
		return self.__dict__

	@staticmethod
	def from_json(json: dict) -> TwinFlux:
		curve = list(json["curve"])
		distance = float(json["distance"])
		return TwinFlux(curve=curve, distance=distance)

# ======================================================== #

@dataclass(kw_only=True)
class TwinBeam:
	shape: PROJECTION
	filters: list[list[str | float]]
	internal_filters: list[list[str | float]]

	def to_json(self) -> dict:
		return self.__dict__

	@staticmethod
	def from_json(json: dict) -> TwinBeam:
		shape = PROJECTION(json["shape"])
		filters = list(json["filters"])
		internal_filters = list(json["inherent_filteration"])
		return TwinBeam(shape=shape, filters=filters, internal_filters=internal_filters)



@dataclass(kw_only=True)
class TwinBeamMonochromatic(TwinBeam):
	beam_type: Literal["monochromatic"] = "monochromatic"
	keV: tuple[float, float]
	flux: TwinFlux

	def to_json(self) -> dict:
		return self.__dict__

	@staticmethod
	def from_json(json: dict) -> TwinBeamMonochromatic:
		flux: TwinFlux = TwinFlux.from_json(json["flux"])
		keV = float(json["keV"][0]), float(json["keV"][1])
		shape = json["shape"]

		# No filtration for monochromatic source
		filters = []
		internal_filters = []

		return TwinBeamMonochromatic(keV=keV, flux=flux, shape=shape, filters=filters, internal_filters=internal_filters)


@dataclass(kw_only=True)
class TwinBeamTube(TwinBeam):
	beam_type: Literal["tube"] = "tube"
	keV: tuple[float, float]
	uA: tuple[float, float]
	flux: TwinFlux

	def to_json(self) -> dict:
		return self.__dict__

	@staticmethod
	def from_json(json: dict) -> TwinBeamTube:
		twin_beam: TwinBeam = TwinBeam.from_json(json)

		keV = tuple(json["keV"])
		uA = tuple(json["uA"])
		flux: TwinFlux = TwinFlux.from_json(json["flux"])

		return TwinBeamTube(keV=keV, uA=uA, flux=flux, **twin_beam.to_json())


@dataclass(kw_only=True)
class TwinBeamFixedSpectrum(TwinBeam):
	beam_type: Literal["fixed-spectrum"] = "fixed-spectrum"
	spectrum: list[tuple[float, float]]

	def to_json(self) -> dict:
		return self.__dict__

	@staticmethod
	def from_json(json: dict) -> TwinBeamFixedSpectrum:
		twin_beam = TwinBeam.from_json(json)
		spectrum = list(json["spectrum"])
		return TwinBeamFixedSpectrum(spectrum=spectrum, **twin_beam.to_json())


def beam_from_json(json: dict) -> TwinBeam:
	if "beam_type" not in json:
		raise KeyError(
			"Beam requires a 'beam_type' property. Supported types: ['monochromatic', 'tube', 'fixed-spectrum']"
		)

	if json["beam_type"] == "monochromatic":
		return TwinBeamMonochromatic.from_json(json)

	if json["beam_type"] == "fixed-spectrum":
		return TwinBeamFixedSpectrum.from_json(json)

	if json["beam_type"] == "tube":
		return TwinBeamTube.from_json(json)

	raise KeyError(
		f"Unknown beam type '{json['beam_type']}'. Supported types: ['monochromatic', 'tube', 'fixed-spectrum']"
	)


# ======================================================== #

@dataclass(kw_only=True)
class TwinScintillator:
	material: str
	thickness: float
	energy_response: list[tuple[float, float]] | None

	def to_json(self) -> dict:
		return self.__dict__

	@staticmethod
	def from_json(json: dict) -> TwinScintillator:
		material = json["material"]
		thickness = float(json["thickness"])
		energy_response = None
		if "energy_response" in json:
			energy_response = list(json["energy_response"])

		return TwinScintillator(
			material=material, thickness=thickness, energy_response=energy_response
		)


@dataclass(kw_only=True)
class TwinGain:
	k: float
	gains: list[float]

	def to_json(self) -> dict:
		return self.__dict__

	@staticmethod
	def from_json(json: dict) -> TwinGain:
		k = float(json["k"])
		gains = list(json["gains"])

		return TwinGain(k=k, gains=gains)


@dataclass(kw_only=True)
class TwinDetector:
	exposures: list[float]
	resolutions: list[tuple[int, int]]
	pixel_pitch: float
	lsf: list[float]
	scintillator: TwinScintillator
	gain: TwinGain

	def to_json(self) -> dict:
		return self.__dict__

	@staticmethod
	def from_json(json: dict) -> TwinDetector:
		exposures = list(json["exposures"])
		resolutions = list(json["resolutions"])
		pixel_pitch = float(json["pixel_pitch"])
		lsf = list(json["lsf"])
		scintillator = TwinScintillator.from_json(json["scintillator"])
		gain = TwinGain.from_json(json["gain"])

		return TwinDetector(
			exposures=exposures,
			resolutions=resolutions,
			pixel_pitch=pixel_pitch,
			lsf=lsf,
			scintillator=scintillator,
			gain=gain,
		)

# ======================================================== #


@dataclass(kw_only=True)
class XYZRange:
	x: tuple[float, float, float | None]
	y: tuple[float, float, float | None]
	z: tuple[float, float, float | None]

	def to_json(self) -> dict:
		return self.__dict__

	@staticmethod
	def from_json(json: dict) -> XYZRange:
		x = tuple(json["x"])
		y = tuple(json["y"])
		z = tuple(json["z"])

		return XYZRange(x=x, y=y, z=z)


@dataclass(kw_only=True)
class TwinStage:
	source: XYZRange
	detector: XYZRange
	static_sdd: bool

	def to_json(self) -> dict:
		return self.__dict__

	@staticmethod
	def from_json(json: dict) -> TwinStage:
		source = XYZRange.from_json(json["source"])
		detector = XYZRange.from_json(json["detector"])
		static_sdd = bool(json["static_sdd"])

		return TwinStage(
			source=source,
			detector=detector,
			static_sdd=static_sdd,
		)

# ======================================================== #


@dataclass(kw_only=True)
class DigitalTwin:
	name: str
	description: str
	facility: str
	date: str

	beams: dict[str, TwinBeam]
	detector: TwinDetector
	stage: TwinStage

	def to_json(self) -> dict:
		return self.__dict__

	@staticmethod
	def from_json(json: dict) -> DigitalTwin:
		name = json["name"]
		facility = json["facility"]
		description = json["description"]
		date = json["date"]
		beams = {}

		for key, value in dict(json["beams"]).items():
			beams[key] = beam_from_json(value)

		detector = TwinDetector.from_json(json["detector"])
		stage = TwinStage.from_json(json["stage"])

		return DigitalTwin(
			name=name,
			facility=facility,
			description=description,
			date=date,
			beams=beams,
			detector=detector,
			stage=stage,
		)


def twin_from_file(file: Path) -> DigitalTwin:
	twin = None
	with file.open("r") as f:
		twin = DigitalTwin.from_json(json5.load(f))
	return twin

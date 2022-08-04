from dataclasses import dataclass
from typing import Dict, Type, Union, cast
from cil.framework import ImageGeometry
from cil.optimisation.functions import (IndicatorBox, TotalVariation, Function)
from cil.plugins.ccpi_regularisation.functions import (FGP_TV, TGV, TNV)
import numpy as np

@dataclass(frozen=True)
class Constraint():
	method:str

	def get(self, ig:ImageGeometry) -> Function:
		...

@dataclass(frozen=True)
class ConstraintParams():
	...

# ------------------------

@dataclass(frozen=True)
class BoxConstraintParams(ConstraintParams):
	upper: float = np.inf
	lower: float = -np.inf

@dataclass(frozen=True)
class BoxConstraint(Constraint):
	method:str = "box"
	params:BoxConstraintParams = BoxConstraintParams()

	def get(self, ig:ImageGeometry) -> Function:
		return IndicatorBox(self.params.lower, self.params.upper)

# ------------------------

@dataclass(frozen=True)
class TVConstraintParams(ConstraintParams):
	iterations: int = 100
	alpha: float = 0.1
	tolerance: float = 1
	upper: float = np.inf
	lower: float = -np.inf
	isotropic: bool = True

@dataclass(frozen=True)
class TVConstraint(Constraint):
	method:str = "tv"
	params:TVConstraintParams = TVConstraintParams()

	def get(self, ig:ImageGeometry) -> Function:
		return self.params.alpha * TotalVariation(self.params.iterations,
			self.params.tolerance / 1000000,
			upper=self.params.upper,
			lower=self.params.lower,
			isotropic=self.params.isotropic)

# ------------------------

@dataclass(frozen=True)
class FGPTVConstraintParams(ConstraintParams):
	iterations: int = 100
	alpha: float = 1
	tolerance: float = 1
	isotropic: bool = True
	nonnegativity: bool = True

@dataclass(frozen=True)
class FGPTVConstraint(Constraint):
	method:str = "fgp-tv"
	params:FGPTVConstraintParams = FGPTVConstraintParams()

	def get(self, ig:ImageGeometry) -> Function:
		# The FGP_TV regularisation does not incorporate information on the
		# ImageGeometry, i.e., pixel/voxel size.
		# https://tomographicimaging.github.io/CIL/nightly/plugins.html#total-variation
		return (self.params.alpha / ig.voxel_size_x) * FGP_TV(max_iteration=self.params.iterations,
			tolerance=self.params.tolerance / 1000000,
			isotropic=self.params.isotropic,
			nonnegativity=self.params.nonnegativity,
			device="gpu")

# ------------------------

@dataclass(frozen=True)
class TGVConstraintParams(ConstraintParams):
	iterations: int = 100
	alpha: float = 0.1
	tolerance: float = 1
	gamma: float = 1

@dataclass(frozen=True)
class TGVConstraint(Constraint):
	method:str = "tgv"
	params:TGVConstraintParams = TGVConstraintParams()

	def get(self, ig:ImageGeometry) -> Function:
		return TGV(alpha=self.params.alpha,
			gamma=self.params.gamma,
			max_iteration=self.params.iterations,
			tolerance=self.params.tolerance / 1000000,
			device="cpu")

# ------------------------

Constraints:Dict[str, Dict[str, Union[Type[Constraint], Type[ConstraintParams]]]] = {
	"box": {
		"type": BoxConstraint,
		"params":BoxConstraintParams
	},
	"tv": {
		"type": TVConstraint,
		"params": TVConstraintParams
	},
	"fgp-tv": {
		"type": FGPTVConstraint,
		"params": FGPTVConstraintParams
	},
	"tgv": {
		"type": TGVConstraint,
		"params": TGVConstraintParams
	},
}

def ConstraintFromJson(json:dict) -> Constraint:
	if "method" not in json:
		raise KeyError("Constraint key lacks a method key.")
	if "params" not in json:
		raise KeyError("Constraint key lacks a param key.")

	if json["method"] not in Constraints:
		raise NotImplementedError(f"Constraint '{json['method']}' is not supported.")

	conType:Type[Constraint] = cast(Type[Constraint], Constraints[json["method"]]["type"])
	conParams = json["params"]

	if conType == BoxConstraint:
		upper = np.inf
		lower = -np.inf
		# Check to see if bound values exist and are not none. Json does not
		# support negative infinities, and they are therefore represented as
		# null.
		if "upper" in conParams:
			if conParams["upper"] is not None:
				upper = float(conParams["upper"])
		if "lower" in conParams:
			if conParams["lower"] is not None:
				lower = float(conParams["lower"])
		return BoxConstraint(params=BoxConstraintParams(upper, lower))

	elif conType == TVConstraint:
		alpha = 0.1
		iterations = 100
		tolerance = 1
		upper = np.inf
		lower = -np.inf
		isotropic = True

		if "alpha" in conParams:
			alpha = float(conParams["alpha"])
		if "iterations" in conParams:
			iterations = int(conParams["iterations"])
		if "tolerance" in conParams:
			tolerance = float(conParams["tolerance"])
		if "upper" in conParams:
			if conParams["upper"] is not None:
				upper = float(conParams["upper"])
		if "lower" in conParams:
			if conParams["lower"] is not None:
				lower = float(conParams["lower"])
		if "isotropic" in conParams:
			isotropic = bool(conParams["isotropic"])

		tvparams = TVConstraintParams(
			iterations=iterations,
			alpha=alpha,
			tolerance=tolerance,
			upper=upper,
			lower=lower,
			isotropic=isotropic)

		return TVConstraint(params=tvparams)

	elif conType == FGPTVConstraint:
		iterations = 100
		alpha = 1
		tolerance = 1
		isotropic = True
		nonnegativity = True

		if "alpha" in conParams:
			alpha = float(conParams["alpha"])
		if "iterations" in conParams:
			iterations = int(conParams["iterations"])
		if "tolerance" in conParams:
			tolerance = float(conParams["tolerance"])
		if "isotropic" in conParams:
			isotropic = bool(conParams["isotropic"])
		if "nonnegativity" in conParams:
			nonnegativity = bool(conParams["nonnegativity"])

		fgptvparams = FGPTVConstraintParams(
			iterations=iterations,
			alpha=alpha,
			tolerance=tolerance,
			isotropic=isotropic,
			nonnegativity=nonnegativity)

		return FGPTVConstraint(params=fgptvparams)

	elif conType == TGVConstraint:
		iterations = 100
		alpha = 1
		gamma = 1
		tolerance = 1

		if "alpha" in conParams:
			alpha = float(conParams["alpha"])
		if "gamma" in conParams:
			gamma = float(conParams["gamma"])
		if "iterations" in conParams:
			iterations = int(conParams["iterations"])
		if "tolerance" in conParams:
			tolerance = float(conParams["tolerance"])

		tgvparams = TGVConstraintParams(
			iterations=iterations,
			alpha=alpha,
			gamma=gamma,
			tolerance=tolerance)

		return TGVConstraint(params=tgvparams)

	else:
		raise NotImplementedError(f"Constraint method '{conType}' is not implemented.")

from dataclasses import dataclass
from typing import Dict, Type, Union, cast
from cil.optimisation.functions import (IndicatorBox, TotalVariation, Function)
import numpy as np

@dataclass(frozen=True)
class Constraint():
	method:str

	def get(self) -> Function:
		...

@dataclass(frozen=True)
class ConstraintParams():
	...

@dataclass(frozen=True)
class BoxConstraintParams(ConstraintParams):
	upper: float = np.inf
	lower: float = -np.inf

@dataclass(frozen=True)
class BoxConstraint(Constraint):
	method:str = "box"
	params:BoxConstraintParams = BoxConstraintParams()

	def get(self) -> Function:
		return IndicatorBox(self.params.lower, self.params.upper)

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

	def get(self) -> Function:
		return self.params.alpha * TotalVariation(self.params.iterations,
			self.params.tolerance / 1000000,
			upper=self.params.upper,
			lower=self.params.lower,
			isotropic=self.params.isotropic)

Constraints:Dict[str, Dict[str, Union[Type[Constraint], Type[ConstraintParams]]]] = {
	"box": {
		"type": BoxConstraint,
		"params":BoxConstraintParams
	},
	"tv": {
		"type": TVConstraint,
		"params": TVConstraintParams
	}
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

		tvparams = TVConstraintParams(iterations, alpha, tolerance, upper, lower, isotropic)
		return TVConstraint(params=tvparams)
	else:
		raise NotImplementedError(f"Constraint method '{conType}' is not implemented.")

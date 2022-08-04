from dataclasses import dataclass
from typing import Dict, Type, Union, cast
from cil.framework import AcquisitionData, ImageGeometry
from cil.plugins.astra import ProjectionOperator
from cil.optimisation.functions import (IndicatorBox, TotalVariation, Function, LeastSquares)
import numpy as np

@dataclass(frozen=True)
class DiffParams():
	...

@dataclass(frozen=True)
class Diff():
	method: str
	params: DiffParams

	def get(self, ig:ImageGeometry, data:AcquisitionData) -> Function:
		...

@dataclass(frozen=True)
class DiffLeastSquaresParams(DiffParams):
	scaling_constant: float = 1
	weight: float = 1

@dataclass(frozen=True)
class DiffLeastSquares(Diff):
	method: str = "projection"
	params: DiffLeastSquaresParams = DiffLeastSquaresParams()

	def get(self, ig:ImageGeometry, data:AcquisitionData) -> Function:
		opProj = ProjectionOperator(ig, data)
		return LeastSquares(opProj, data, c=self.params.scaling_constant, weight=self.params.weight)


Diffs:Dict[str, Dict[str, Union[Type[Diff], Type[DiffParams]]]] = {
	"leastsquares": {
		"type": DiffLeastSquares,
		"params": DiffLeastSquaresParams
	}
}

def DiffFromJson(json:dict) -> Diff:
	if "method" not in json:
		raise KeyError("Diff key lacks a method key.")
	if "params" not in json:
		raise KeyError("Diff key lacks a param key.")

	if json["method"] not in Diff:
		raise NotImplementedError(f"Diff '{json['method']}' is not supported.")

	diffType:Type[Diff] = cast(Type[Diff], Diffs[json["method"]]["type"])
	diffParams = json["params"]

	if diffType == DiffLeastSquares:
		scaling_constant = 1
		if "scaling_constant" in diffParams:
			scaling_constant = diffParams["scaling_constant"]
		weight = 1
		if "weight" in diffParams:
			weight = diffParams["weight"]
		diffLSParams = DiffLeastSquaresParams(scaling_constant, weight)
		return DiffLeastSquares(params=diffLSParams)

	# elif conType == TVDiff:
	# 	...
	else:
		raise NotImplementedError(f"Diff method '{diffType}' is not implemented.")

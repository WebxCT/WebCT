from dataclasses import dataclass
from typing import Dict, Type, Union, cast
from cil.framework import ImageGeometry
from cil.optimisation.functions import (IndicatorBox, TotalVariation, Function)
from cil.plugins.ccpi_regularisation.functions import (FGP_TV, TGV, TNV)
import numpy as np

@dataclass(frozen=True)
class Proximal():
	method:str

	def get(self, ig:ImageGeometry) -> Function:
		...

@dataclass(frozen=True)
class ProximalParams():
	...

# ------------------------

@dataclass(frozen=True)
class BoxProximalParams(ProximalParams):
	upper: float = np.inf
	lower: float = -np.inf

@dataclass(frozen=True)
class BoxProximal(Proximal):
	method:str = "box"
	params:BoxProximalParams = BoxProximalParams()

	def get(self, ig:ImageGeometry) -> Function:
		return IndicatorBox(self.params.lower, self.params.upper)

# ------------------------

@dataclass(frozen=True)
class TVProximalParams(ProximalParams):
	iterations: int = 100
	alpha: float = 0.1
	tolerance: float = 1
	upper: float = np.inf
	lower: float = -np.inf
	isotropic: bool = True

@dataclass(frozen=True)
class TVProximal(Proximal):
	method:str = "tv"
	params:TVProximalParams = TVProximalParams()

	def get(self, ig:ImageGeometry) -> Function:
		return self.params.alpha * TotalVariation(self.params.iterations,
			self.params.tolerance / 1000000,
			upper=self.params.upper,
			lower=self.params.lower,
			isotropic=self.params.isotropic)

# ------------------------

@dataclass(frozen=True)
class FGPTVProximalParams(ProximalParams):
	iterations: int = 100
	alpha: float = 1
	tolerance: float = 1
	isotropic: bool = True
	nonnegativity: bool = True

@dataclass(frozen=True)
class FGPTVProximal(Proximal):
	method:str = "fgp-tv"
	params:FGPTVProximalParams = FGPTVProximalParams()

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
class TGVProximalParams(ProximalParams):
	iterations: int = 100
	alpha: float = 0.1
	tolerance: float = 1
	gamma: float = 1

@dataclass(frozen=True)
class TGVProximal(Proximal):
	method:str = "tgv"
	params:TGVProximalParams = TGVProximalParams()

	def get(self, ig:ImageGeometry) -> Function:
		return TGV(alpha=self.params.alpha,
			gamma=self.params.gamma,
			max_iteration=self.params.iterations,
			tolerance=self.params.tolerance / 1000000,
			device="cpu")

# ------------------------

Proximals:Dict[str, Dict[str, Union[Type[Proximal], Type[ProximalParams]]]] = {
	"box": {
		"type": BoxProximal,
		"params":BoxProximalParams
	},
	"tv": {
		"type": TVProximal,
		"params": TVProximalParams
	},
	"fgp-tv": {
		"type": FGPTVProximal,
		"params": FGPTVProximalParams
	},
	"tgv": {
		"type": TGVProximal,
		"params": TGVProximalParams
	},
}

def ProximalFromJson(json:dict) -> Proximal:
	if "method" not in json:
		raise KeyError("Proximal key lacks a method key.")
	if "params" not in json:
		raise KeyError("Proximal key lacks a param key.")

	if json["method"] not in Proximals:
		raise NotImplementedError(f"Proximal '{json['method']}' is not supported.")

	conType:Type[Proximal] = cast(Type[Proximal], Proximals[json["method"]]["type"])
	conParams = json["params"]

	if conType == BoxProximal:
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
		return BoxProximal(params=BoxProximalParams(upper, lower))

	elif conType == TVProximal:
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

		tvparams = TVProximalParams(
			iterations=iterations,
			alpha=alpha,
			tolerance=tolerance,
			upper=upper,
			lower=lower,
			isotropic=isotropic)

		return TVProximal(params=tvparams)

	elif conType == FGPTVProximal:
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

		fgptvparams = FGPTVProximalParams(
			iterations=iterations,
			alpha=alpha,
			tolerance=tolerance,
			isotropic=isotropic,
			nonnegativity=nonnegativity)

		return FGPTVProximal(params=fgptvparams)

	elif conType == TGVProximal:
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

		tgvparams = TGVProximalParams(
			iterations=iterations,
			alpha=alpha,
			gamma=gamma,
			tolerance=tolerance)

		return TGVProximal(params=tgvparams)

	else:
		raise NotImplementedError(f"Proximal method '{conType}' is not implemented.")

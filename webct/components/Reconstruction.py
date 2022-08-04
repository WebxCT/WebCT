from dataclasses import dataclass
from typing import Dict, Literal, Optional, Tuple, Type, Union, cast

import numpy as np
from cil.framework import AcquisitionData, AcquisitionGeometry, ImageData, ImageGeometry, BlockDataContainer
from cil.optimisation.functions import (BlockFunction, IndicatorBox, TotalVariation, Function)
from cil.optimisation.operators import (Operator, IdentityOperator, BlockOperator, GradientOperator)
from cil.optimisation.algorithms import CGLS, SIRT
from cil.plugins.astra.operators import ProjectionOperator
from cil.recon import FBP, FDK
from cil.processors import AbsorptionTransmissionConverter

from matplotlib import use
from webct.components.Beam import PROJECTION, BeamParameters
from webct.components.Capture import CaptureParameters
from webct.components.Detector import DetectorParameters
from webct.components.sim.Quality import Quality

use("Agg")

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
	tolerance: float = 1
	upper: float = np.inf
	lower: float = -np.inf
	isotropic: bool = True

@dataclass(frozen=True)
class TVConstraint(Constraint):
	method:str = "tv"
	params:TVConstraintParams = TVConstraintParams()

	def get(self) -> Function:
		return TotalVariation(self.params.iterations,
			self.params.tolerance / 1000000,
			upper=self.params.upper,
			lower=self.params.lower,
			isotropic=self.params.isotropic)

class IterativeBlockParams():
	...

@dataclass(frozen=True)
class IterativeOperator:
	method:str
	params:IterativeBlockParams

	def get(self, ig:ImageGeometry, acData:AcquisitionData) -> Tuple[BlockOperator, Operator]:
		...

@dataclass(frozen=True)
class ProjectionBlockParams(IterativeBlockParams):
	...

@dataclass(frozen=True)
class ProjectionBlock(IterativeOperator):
	method:str = "projection"
	params:ProjectionBlockParams = ProjectionBlockParams()

	def get(self, ig:ImageGeometry, acData:AcquisitionData) -> Tuple[Operator, None]:
		opProj = ProjectionOperator(ig,acData.geometry)
		# Wrapping a projectionoperator in a block operator causes an invalid reconstruction output
		# opblock_proj = BlockOperator(opProj)

		return opProj, None

@dataclass(frozen=True)
class IdentityBlockParams(IterativeBlockParams):
	alpha:float=0.1

@dataclass(frozen=True)
class IdentityBlock(IterativeOperator):
	method:str = "identity"
	params:IdentityBlockParams = IdentityBlockParams()

	def get(self, ig:ImageGeometry, acData:AcquisitionData) -> Tuple[BlockOperator, Operator]:
		opProj = ProjectionOperator(ig,acData.geometry)
		opIdent = IdentityOperator(ig)

		opblock_ident = BlockOperator(opProj, self.params.alpha * opIdent)
		return opblock_ident, opIdent

@dataclass(frozen=True)
class GradientBlockParams(IterativeBlockParams):
	alpha:float = 0.1
	boundary:Union[Literal["Neumann"], Literal["Periodic"]] = "Neumann"

@dataclass(frozen=True)
class GradientBlock(IterativeOperator):
	method:str = "gradient"
	params:GradientBlockParams = GradientBlockParams()

	def get(self, ig:ImageGeometry, acData:AcquisitionData) -> Tuple[BlockOperator, Operator]:
		opProj = ProjectionOperator(ig, acData.geometry)
		opGrad = GradientOperator(ig, bnd_cond=self.params.boundary)

		opblock_grad = BlockOperator(opProj, self.params.alpha * opGrad)
		return opblock_grad, opGrad

@dataclass(frozen=True)
class ReconParameters:
	quality: Quality
	method: str

@dataclass(frozen=True)
class FDKParam(ReconParameters):
	method: str = "FDK"
	filter: str = "ram_lak"

@dataclass(frozen=True)
class FBPParam(ReconParameters):
	method: str = "FBP"
	filter: str = "ram_lak"

@dataclass(frozen=True)
class CGLSParam(ReconParameters):
	method: str = "CGLS"
	iterations: int = 10
	tolerance:float = 1
	operator: IterativeOperator = ProjectionBlock()

@dataclass(frozen=True)
class SIRTParam(ReconParameters):
	method: str = "SIRT"
	iterations: int = 10
	constraint: Constraint = BoxConstraint()

@dataclass(frozen=True)
class PDHGParam(ReconParameters):
	f: BlockFunction
	g: IndicatorBox
	operator: Operator
	sigma: float
	tau: float
	max_iterations: int
	update_objective_interval: int

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

IterativeOperators:Dict[str, Dict[str, Union[Type[IterativeOperator], Type[IterativeBlockParams]]]] = {
	"projection": {
		"type": ProjectionBlock,
		"params":ProjectionBlockParams
	},
	"identity": {
		"type": IdentityBlock,
		"params":IdentityBlockParams
	},
	"gradient": {
		"type": GradientBlock,
		"params":GradientBlockParams
	}
}

ReconMethods = {
	"FDK": {
		"type": FDKParam,
		"projections": (PROJECTION.POINT)
	},
	"FBP": {
		"type": FBPParam,
		"projections": (PROJECTION.PARALLEL)
	},
	"CGLS": {
		"type": CGLSParam,
		"projections": (PROJECTION.PARALLEL)
	},
	"SIRT": {
		"type": SIRTParam,
		"projections": (PROJECTION.PARALLEL)
	}
	# "PDHG": {
	# 	"type":PDHGParam,
	# 	"projections": (PROJECTION.PARALLEL, PROJECTION.POINT)
	# }
}

def dataWithOp(operator:IterativeOperator, ig:ImageGeometry, acData:AcquisitionData) -> Tuple[Union[BlockOperator,ProjectionOperator], Union[AcquisitionData, BlockDataContainer]]:
		# Note: A projection operator will return (Operator, None)
		blockOp, Lop = operator.get(ig, acData)

		# Need to allocate data into a BlockDataContainer when using
		# block operations. The projection block operator is just a
		# wrapped ProjectionOperator, and does not work on
		# BlockDataContainer.
		data = acData
		if operator.method != "projection":
			if Lop.range is not None:
				data = BlockDataContainer(acData, Lop.range.allocate(0))
			else:
				raise ValueError(f"Unexpected None range of block projection operator '{operator.method}'")
		return blockOp, data

def reconstruct(projections: np.ndarray, capture: CaptureParameters, beam: BeamParameters, detector: DetectorParameters, params: ReconParameters) -> np.ndarray:
	# Get reconstruction method
	method_name = params.method.upper()

	print(f"Reconstructing with {str(params)} Paramaters")

	if method_name not in ReconMethods:
		raise NotImplementedError("Method is not supported.")
	method = ReconMethods[method_name]

	if beam.projection not in method["projections"]:
		raise ValueError(f"{method_name} does not support {beam.projection} beam configurations.")

	geo: Optional[AcquisitionGeometry] = None
	if beam.projection == PROJECTION.PARALLEL:
		geo = AcquisitionGeometry.create_Parallel3D(detector_position=capture.detector_position)
	elif beam.projection == PROJECTION.POINT:
		geo = AcquisitionGeometry.create_Cone3D(source_position=capture.beam_position, detector_position=capture.detector_position)
	assert geo is not None
	# Acquisition geometry

	# Panel is height x width
	geo.set_panel(projections.shape[1:][::-1], detector.pixel_size)
	geo.set_angles(capture.angles)
	geo.set_labels(["angle", "vertical", "horizontal"])

	# Acquisition data
	acData:AcquisitionData = geo.allocate()
	acData.fill(projections)

	# Correction
	acData = AbsorptionTransmissionConverter()(acData)

	rec: Optional[ImageData] = None
	ig = geo.get_ImageGeometry()

	# FDK Reconstruction
	if method_name == "FDK":
		acData.reorder("tigre")
		params = cast(FDKParam, params)
		rec = FDK(acData, ig, params.filter).run()

	elif method_name == "FBP":
		acData.reorder("tigre")
		params = cast(FBPParam, params)
		rec = FBP(acData, ig, params.filter).run()

	elif method_name == "CGLS":
		acData.reorder("astra")
		params = cast(CGLSParam, params)

		# Reconstruction operator
		blockOp, data = dataWithOp(params.operator, ig, acData)

		# Run CGLS Reconstruction
		cgls = CGLS(operator=blockOp,
					data=data,
					max_iteration = params.iterations,
					tolerance=params.tolerance / 1000000)
		cgls.run(verbose=True)
		rec = cgls.solution

	elif method_name == "SIRT":
		acData.reorder("astra")
		params = cast(SIRTParam, params)

		# After a long debugging session, it turns out that SIRT fails when
		# using block operators, such as IdentityOperator and GradientOperator
		# for Tikhonov regularisation.
		blockOp, data = dataWithOp(ProjectionBlock(), ig, acData)

		# Run CGLS Reconstruction
		sirt = SIRT(ig.allocate(),
			operator=blockOp,
			data=data,
			constraint=params.constraint.get(),
			max_iteration=params.iterations)
		sirt.run(verbose=True)

		# Get the last solution
		rec = sirt.solution

	# elif method_name == "PDHG":
		...
		# grad = GradientOperator(ig)
		# op = BlockOperator(projections, grad)
		# alpha = 0.1
		# func1 = 0.5 * L2NormSquared(b=projections)
		# func2 = alpha * MixedL21Norm()
		# f = BlockFunction(func1, func2)
		# g = IndicatorBox(lower=0)
		# rec = PDHG(f=f, g=g,operator=op,**params).run()
	else:
		raise NotImplementedError(f"Reconstruction method {method_name} is not implemented.")

	assert rec is not None
	return rec.as_array()

def asSinogram(projections: np.ndarray, capture: CaptureParameters, beam: BeamParameters, detector: DetectorParameters) -> np.ndarray:
	geo: Optional[AcquisitionGeometry] = None
	if beam.projection == PROJECTION.PARALLEL:
		geo = AcquisitionGeometry.create_Parallel3D(detector_position=capture.detector_position)
	elif beam.projection == PROJECTION.POINT:
		geo = AcquisitionGeometry.create_Cone3D(source_position=capture.beam_position, detector_position=capture.detector_position)
	assert geo is not None
	# Panel is height x width
	geo.set_labels(["angle", "vertical", "horizontal"])

	# Panel is height x width
	geo.set_panel(projections.shape[1:][::-1], detector.pixel_size)
	geo.set_angles(capture.angles)
	geo.set_labels(["angle", "vertical", "horizontal"])

	acData: AcquisitionData = geo.allocate()
	acData.fill(projections)
	acData = AbsorptionTransmissionConverter()(acData)
	acData.reorder(("vertical", "angle", "horizontal"))


	return acData.array

def OperatorFromJson(json: dict) -> IterativeOperator:
	if "method" not in json:
		raise KeyError("Operator key lacks a method key.")
	if "params" not in json:
		raise KeyError("Operator key lacks a param key.")

	if json["method"] not in IterativeOperators:
		raise NotImplementedError(f"Iterative operator '{json['method']}' is not supported.")

	opType:Type[IterativeOperator] = cast(Type[IterativeOperator], IterativeOperators[json["method"]]["type"])
	opParams = json["params"]

	if opType == ProjectionBlock:
		return ProjectionBlock()

	elif opType == IdentityBlock:
		alpha = 0.1
		if "alpha" in opParams:
			alpha = float(opParams["alpha"])
		operatorParams = IdentityBlockParams(alpha)
		return IdentityBlock(params=operatorParams)

	elif opType == GradientBlock:
		alpha = 0.1
		if "alpha" in opParams:
			alpha = float(opParams["alpha"])
		boundary = "Neumann"

		if "boundary" in opParams:
			if opParams["boundary"].lower() == "periodic":
				boundary = "Periodic"

		operatorParams = GradientBlockParams(alpha, boundary)
		return GradientBlock(params=operatorParams)

	else:
		raise NotImplementedError(f"Iterative operator {opType} is not implemented.")

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
		iterations = 100
		tolerance = 1
		upper = np.inf
		lower = -np.inf
		isotropic = True

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

		tvparams = TVConstraintParams(iterations, tolerance, upper, lower, isotropic)
		return TVConstraint(params=tvparams)
	else:
		raise NotImplementedError(f"Constraint method '{json['method']}' is not implemented.")

def ReconstructionFromJson(json: dict) -> ReconParameters:
	"""Select and create reconstruction parameters from a json dict."""
	if "method" not in json:
		raise KeyError("Given dict does not contain a 'method' key.")
	method = json["method"].upper()
	if json["method"] not in ReconMethods:
		raise TypeError(f"Method '{json['method']}' is not supported.")

	if "quality" not in json:
		raise KeyError("Given dict does not contain a 'quality' key.")

	quality = int(json["quality"])
	quality = Quality(quality)

	if method == "FDK":
		filter = "ram-lak"
		if "filter" in json:
			filter = str(json["filter"])
		return FDKParam(quality=quality, filter=filter)
	elif method == "FBP":
		filter = "ram-lak"
		if "filter" in json:
			filter = str(json["filter"])
		return FBPParam(quality=quality, filter=filter)
	elif method == "CGLS":
		# Operator
		operator:IterativeOperator = ProjectionBlock()
		if "operator" in json:
			operator = OperatorFromJson(json["operator"])

		iterations:int = 10
		if "iterations" in json:
			iterations = int(json["iterations"])

		# Tolerance is in e-6
		tolerance = 1
		if "tolerance" in json:
			tolerance = float(json["tolerance"])
		return CGLSParam(quality=quality, iterations=iterations, operator=operator, tolerance=tolerance)
	elif method == "SIRT":
		iterations:int = 10
		if "iterations" in json:
			iterations = int(json["iterations"])

		constraint = BoxConstraint()
		if "constraint" in json:
			constraint = ConstraintFromJson(json["constraint"])

		return SIRTParam(quality=quality, iterations=iterations, constraint=constraint)
	else:
		raise TypeError(f"Recon paramaters for '{method}' is not supported.")

from dataclasses import dataclass
from typing import Callable, ClassVar, Dict, Literal, Optional, Tuple, Type, Union, cast

import numpy as np
from cil.framework import AcquisitionData, AcquisitionGeometry, ImageData, ImageGeometry, BlockDataContainer
from cil.optimisation.functions import (BlockFunction, IndicatorBox)
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

class IterativeBlockParams():
	...

@dataclass(frozen=True)
class IterativeOperator:
	method:str
	params:IterativeBlockParams

	@staticmethod
	def get(ig:ImageGeometry, acData:AcquisitionData, params:IterativeBlockParams) -> Tuple[BlockOperator, Operator]:
		...

@dataclass(frozen=True)
class ProjectionBlockParams(IterativeBlockParams):
	...

@dataclass(frozen=True)
class ProjectionBlock(IterativeOperator):
	method:str = "projection"
	params:ProjectionBlockParams = ProjectionBlockParams()

	@staticmethod
	def get(ig:ImageGeometry, acData:AcquisitionData, params:ProjectionBlockParams) -> Tuple[Operator, None]:
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

	@staticmethod
	def get(ig:ImageGeometry, acData:AcquisitionData, params:IdentityBlockParams) -> Tuple[BlockOperator, Operator]:
		opProj = ProjectionOperator(ig,acData.geometry)
		opIdent = IdentityOperator(ig)

		opblock_ident = BlockOperator(opProj, params.alpha * opIdent)
		return opblock_ident, opIdent

@dataclass(frozen=True)
class GradientBlockParams(IterativeBlockParams):
	alpha:float = 0.1
	boundary:Union[Literal["Neumann"], Literal["Periodic"]] = "Neumann"

@dataclass(frozen=True)
class GradientBlock(IterativeOperator):
	method:str = "gradient"
	params:GradientBlockParams = GradientBlockParams()

	@staticmethod
	def get(ig:ImageGeometry, acData:AcquisitionData, params:GradientBlockParams) -> Tuple[BlockOperator, Operator]:
		opProj = ProjectionOperator(ig, acData.geometry)
		opGrad = GradientOperator(ig, bnd_cond=params.boundary)

		opblock_grad = BlockOperator(opProj, params.alpha * opGrad)
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
class PDHGParam(ReconParameters):
	f: BlockFunction
	g: IndicatorBox
	operator: Operator
	sigma: float
	tau: float
	max_iterations: int
	update_objective_interval: int

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
	# "PDHG": {
	# 	"type":PDHGParam,
	# 	"projections": (PROJECTION.PARALLEL, PROJECTION.POINT)
	# }
}

def reconstruct(projections: np.ndarray, capture: CaptureParameters, beam: BeamParameters, detector: DetectorParameters, params: ReconParameters) -> np.ndarray:
	# Get reconstruction method
	method_name = params.method.upper()

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
		# Note: A projection operator will return (Operator, None)
		blockOp, Lop = params.operator.get(ig, acData, params.operator.params)

		# Need to allocate data into a BlockDataContainer when using
		# block operations. The projection block operator is just a
		# wrapped ProjectionOperator, and does not work on
		# BlockDataContainer.
		data = acData
		if params.operator.method != "projection":
			if Lop.range is not None:
				data = BlockDataContainer(acData, Lop.range.allocate(0))
			else:
				raise ValueError(f"Unexpected None range of block projection operator '{params.operator.method}' for CGLS")

		# Run CGLS Reconstruction
		cgls = CGLS(operator=blockOp,
					data=data,
					max_iteration = params.iterations)
		cgls.run(verbose=True)

		# Get the last solution
		rec = cgls.solution

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
		# Variant
		variant:str = ""
		if "variant" in json:
			...

		# Operator
		operator:IterativeOperator = ProjectionBlock()
		if "operator" in json:
			if "method" not in json["operator"]:
				raise KeyError("Operator key lacks a method key.")
			if "params" not in json["operator"]:
				raise KeyError("Operator key lacks a param key.")

			if json["operator"]["method"] in IterativeOperators:
				opType:Type[IterativeOperator] = cast(Type[IterativeOperator], IterativeOperators[json["operator"]["method"]]["type"])
				opParams = json["operator"]["params"]

				if opType == ProjectionBlock:
					operator = ProjectionBlock()

				elif opType == IdentityBlock:
					alpha = 0.1
					if "alpha" in opParams:
						alpha = float(opParams["alpha"])
					operatorParams = IdentityBlockParams(alpha)
					operator = IdentityBlock(params=operatorParams)

				elif opType == GradientBlock:
					alpha = 0.1
					if "alpha" in opParams:
						alpha = float(opParams["alpha"])
					boundary = "Neumann"

					if "boundary" in opParams:
						if opParams["boundary"].lower() == "periodic":
							boundary = "Periodic"

					operatorParams = GradientBlockParams(alpha, boundary)
					operator = GradientBlock(params=operatorParams)

				else:
					raise NotImplementedError(f"Iterative operator {opType} is not implemented.")
			else:
				raise NotImplementedError(f"Iterative operator {json['operator']['method']} is not supported.")

		iterations:int = 10
		if "iterations" in json:
			iterations = int(json["iterations"])

		return CGLSParam(quality=quality, iterations=iterations, operator=operator)
	else:
		raise TypeError(f"Recon paramaters for '{method}' is not supported.")

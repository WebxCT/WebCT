from dataclasses import dataclass
from typing import Optional, cast

import numpy as np
from cil.framework import (
	AcquisitionData, AcquisitionGeometry,
	ImageData)
from cil.optimisation.algorithms import CGLS, SIRT
from cil.processors import AbsorptionTransmissionConverter
from cil.recon import FBP, FDK
from matplotlib import use
from webct.components.Beam import PROJECTION, BeamParameters
from webct.components.Capture import CaptureParameters
from webct.components.Detector import DetectorParameters
from webct.components.recon import (
	BoxConstraint,
	Constraint, ConstraintFromJson,
	IterativeOperator,
	OperatorFromJson, ProjectionBlock,
	dataWithOp)
from webct.components.sim.Quality import Quality

use("Agg")

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
	operator: IterativeOperator = ProjectionBlock()

@dataclass(frozen=True)
class FISTA(ReconParameters):
	method: str = "FISTA"
	iterations: int = 10
	# F: DifferentiableFunction




# @dataclass(frozen=True)
# class PDHGParam(ReconParameters):
# 	f: BlockFunction
# 	g: IndicatorBox
# 	operator: Operator
# 	sigma: float
# 	tau: float
# 	max_iterations: int
# 	update_objective_interval: int

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

		# Reconstruction operator
		blockOp, data = dataWithOp(params.operator, ig, acData)

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
		# operator
		operator:IterativeOperator = ProjectionBlock()
		if "operator" in json:
			operator = OperatorFromJson(json["operator"])

		iterations:int = 10
		if "iterations" in json:
			iterations = int(json["iterations"])

		constraint = BoxConstraint()
		if "constraint" in json:
			constraint = ConstraintFromJson(json["constraint"])

		return SIRTParam(quality=quality, iterations=iterations, constraint=constraint, operator=operator)
	else:
		raise TypeError(f"Recon paramaters for '{method}' is not supported.")

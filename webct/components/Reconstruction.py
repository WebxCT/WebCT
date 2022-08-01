from dataclasses import dataclass
from typing import Dict, Literal, Optional, Tuple, Union, cast

import numpy as np
from cil.framework import AcquisitionData, AcquisitionGeometry, ImageData, ImageGeometry
from cil.optimisation.functions import (BlockFunction, IndicatorBox)
from cil.optimisation.operators import (Operator, IdentityOperator, BlockOperator, GradientOperator)
from cil.optimisation.algorithms import CGLS
from cil.plugins.astra.operators import ProjectionOperator
from cil.recon import FBP, FDK
from cil.processors import AbsorptionTransmissionConverter

from matplotlib import use
from webct.components.Beam import PROJECTION, BeamParameters
from webct.components.Capture import CaptureParameters
from webct.components.Detector import DetectorParameters
from webct.components.sim.Quality import Quality

use("Agg")


class IterativeOperator:
	@staticmethod
	def get(ig:ImageGeometry, acData:AcquisitionData) -> BlockOperator:
		...

class ProjectionBlock(IterativeOperator):
	@staticmethod
	def get(ig:ImageGeometry, acData:AcquisitionData) -> BlockOperator:
		opProj = ProjectionOperator(ig,acData.geometry)
		opblock_proj = BlockOperator(opProj)

		return opblock_proj

class IdentityBlock(IterativeOperator):
	@staticmethod
	def get(ig:ImageGeometry, acData:AcquisitionData, alpha:float=0.1) -> BlockOperator:
		opProj = ProjectionOperator(ig,acData.geometry)
		opIdent = IdentityOperator(ig)

		opblock_ident = BlockOperator(opProj, alpha * opIdent)
		return opblock_ident

class GradientBlock:
	@staticmethod
	def get(ig:ImageGeometry, acData:AcquisitionData, alpha:float=0.1, boundary:Union[Literal["Neumann"], Literal["Periodic"]]="Neumann") -> BlockOperator:
		opProj = ProjectionOperator(ig, acData.geometry)
		opGrad = GradientOperator(acData.geometry, bnd_cond=boundary)

		opblock_grad = BlockOperator(opProj, alpha * opGrad)
		return opblock_grad

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
	variant: str = ""
	iterations: int = 10
	operator: str = "projection"

@dataclass(frozen=True)
class PDHGParam(ReconParameters):
	f: BlockFunction
	g: IndicatorBox
	operator: Operator
	sigma: float
	tau: float
	max_iterations: int
	update_objective_interval: int


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


		# Reconstruction operators
		operator = ProjectionBlock
		if params.operator == "":
			operator = ProjectionBlock.get(ig, acData)
		elif params.operator == "identity":
			operator = IdentityBlock.get(ig, acData)
		elif params.operator == "gradient":
			operator = GradientBlock.get(ig, acData)
		else:
			raise NotImplementedError(f"Operator {params.operator} is not implemented.")

		# Run Reconstruction
		cgls = CGLS(operator=operator,
					data=acData,
					max_iteration = params.iterations)
		cgls.run(verbose=True)

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
	"""Select and create reconstruction paramaters from a json dict."""
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
		return CGLSParam(quality=quality)
	else:
		raise TypeError(f"Recon paramaters for '{method}' is not supported.")

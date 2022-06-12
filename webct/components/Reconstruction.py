from dataclasses import dataclass
from typing import Callable, Optional, Tuple, Union, cast

import numpy as np
from cil.framework import AcquisitionData, AcquisitionGeometry, ImageData
from cil.optimisation.algorithms import PDHG
from cil.optimisation.functions import (BlockFunction, IndicatorBox,
                                        L2NormSquared, MixedL21Norm)
from cil.optimisation.operators import (BlockOperator, GradientOperator,
                                        Operator)
from cil.plugins.astra.operators import ProjectionOperator
from cil.processors import TransmissionAbsorptionConverter
from cil.recon import FBP, FDK
from cil.utilities.display import show2D, show_geometry
from loguru import logger
from matplotlib import use
from webct.components.Beam import PROJECTION, BeamParameters
from webct.components.Capture import CaptureParameters
from webct.components.Detector import DetectorParameters
from webct.components.sim.Quality import Quality

use("Agg")

@dataclass(frozen=True)
class ReconParameters:
	quality:Quality
	method:str

@dataclass(frozen=True)
class FDKParam(ReconParameters):
	method:str="FDK"
	filter:Union[str,np.ndarray]="ram_lak"

@dataclass(frozen=True)
class FBPParam(ReconParameters):
	method:str="FBP"
	filter:Union[str,np.ndarray]="ram_lak"

@dataclass(frozen=True)
class CGLSParam(ReconParameters):
	method:str="CGLS"
	variant:str=""

@dataclass(frozen=True)
class PDHGParam(ReconParameters):
	f:BlockFunction
	g:IndicatorBox
	operator:Operator
	sigma:float
	tau:float
	max_iterations:int
	update_objective_interval:int

ReconMethods = {
	"FDK": {
		"type":FDKParam,
		"projections": (PROJECTION.POINT)
	},
	"FBP": {
		"type":FBPParam,
		"projections": (PROJECTION.PARALLEL)
	},
	"CGLS": {
		"type":CGLSParam,
		"projections": (PROJECTION.PARALLEL)
	},
	# "PDHG": {
	# 	"type":PDHGParam,
	# 	"projections": (PROJECTION.PARALLEL, PROJECTION.POINT)
	# }
}

@logger.catch
def reconstruct(projections:np.ndarray, capture:CaptureParameters, beam:BeamParameters, detector:DetectorParameters, params:ReconParameters) -> np.ndarray:
	# Get reconstruction method
	method_name = params.method.upper()

	if method_name not in ReconMethods:
		raise NotImplementedError("Method is not supported.")
	method = ReconMethods[method_name]

	if beam.projection not in method["projections"]:
		raise ValueError(f"{method_name} does not support {beam.projection} beam configurations.")

	geo:Optional[AcquisitionGeometry] = None
	if beam.projection == PROJECTION.PARALLEL:
		geo = AcquisitionGeometry.create_Parallel3D(detector_position=capture.detector_position)
	elif beam.projection == PROJECTION.POINT:
		geo = AcquisitionGeometry.create_Cone3D(source_position=capture.beam_position, detector_position=capture.detector_position)
	assert geo is not None
	# Aquisition geometry

	# Panel is height x width
	geo.set_panel(projections.shape[1:][::-1], detector.pixel_size)
	geo.set_angles(capture.angles)
	geo.set_labels(["angle", "vertical", "horizontal"])

	# Aquisition data
	acData = geo.allocate()
	acData.fill(projections)
	rec:Optional[ImageData] = None
	ig = geo.get_ImageGeometry()

	# FDK Reconsturction
	if method_name == "FDK":
		acData.reorder("tigre")
		params = cast(FDKParam, params)
		rec = FDK(acData, ig, params.filter).run()

	elif method_name == "FBP":
		acData.reorder("tigre")
		params = cast(FBPParam, params)
		rec = FBP(acData, ig, params.filter).run()

	# elif method_name == "CLGS":
	# 	params = cast(CGLSParam, params)
	# 	if params.variant == "Conv":
	# 		...
	# 	elif params.variant == "Tik":
	# 		...
	# 	elif params.variant == "Tv":
	# 		...
	# 	...

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
		raise NotImplementedError("Projection method is not implemented.")

	assert rec is not None
	return rec.as_array()

def asSinogram(projections:np.ndarray, capture:CaptureParameters, beam:BeamParameters, detector:DetectorParameters) -> np.ndarray:
	geo:Optional[AcquisitionGeometry] = None
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

	acData:AcquisitionData = geo.allocate()
	acData.fill(projections)
	acData.reorder(("vertical","angle","horizontal"))

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
	else:
		raise TypeError(f"Recon paramaters for '{method}' is not supported.")

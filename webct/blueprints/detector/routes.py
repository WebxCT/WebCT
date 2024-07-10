import numpy as np
from dataclasses import dataclass
from flask import jsonify, session, request
from flask.wrappers import Response
from webct.blueprints.detector import bp
from webct.components.Detector import DetectorParameters, EnergyResponse
from webct.components.sim.SimSession import Sim


@bp.route("/detector/set", methods=["PUT"])
def setDetector() -> Response:
	data = request.get_json()
	if data is None:
		return Response(None, 400)

	simdata = Sim(session)
	simdata.detector = DetectorParameters.from_json(data)
	return Response(None, 200)


@dataclass(frozen=True)
class DetectorResponse:
	params: DetectorParameters
	energyResponse: EnergyResponse


@bp.route("/detector/get")
def getDetector() -> Response:

	simdata = Sim(session)
	response = DetectorResponse(simdata.detector, simdata.energyResponse())

	return jsonify(response)

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
	response = DetectorResponse(simdata.detector, simdata.detector.scintillator.response)

	return jsonify(response)


@bp.route("/1x1.svg")
def bin_1x1() -> Response:
	return bp.send_static_file("img/1x1.drawio.svg")


@bp.route("/3x3.svg")
def bin_3x3() -> Response:
	return bp.send_static_file("img/3x3.drawio.svg")


@bp.route("/5x5.svg")
def bin_5x5() -> Response:
	return bp.send_static_file("img/5x5.drawio.svg")


@bp.route("/7x7.svg")
def bin_7x7() -> Response:
	return bp.send_static_file("img/7x7.drawio.svg")


from dataclasses import dataclass

from flask import jsonify, request, session
from flask.wrappers import Response
from webct.blueprints.beam import bp
from webct.components.Beam import BeamFromJson, BeamParameters, Spectra
from webct.components.sim.SimSession import Sim
import logging as log

@bp.route("/beam/set", methods=["PUT"])
def setBeam() -> Response:
	"""Set beam Spectra."""
	data = request.get_json()
	if data is None:
		return Response(None, 400)

	simdata = Sim(session)
	simdata.beam = BeamFromJson(data)
	return Response(None, 200)


@dataclass(frozen=True)
class BeamResponse:
	params: BeamParameters
	filteredSpectra: Spectra
	unfilteredSpectra: Spectra


@bp.route("/beam/get")
def getBeam() -> Response:
	"""Generate and return beam Spectra."""

	simdata = Sim(session)
	response = BeamResponse(
		simdata.beam, simdata.spectra, simdata._unfiltered_beam_spectra
	)
	return jsonify(response)

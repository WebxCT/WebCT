from flask import jsonify, request, session
from flask.wrappers import Response
from webct.blueprints.capture import bp
from webct.components.Capture import CaptureParameters
from webct.components.imgutils import asMp4Str
from webct.components.sim.SimSession import Sim

@bp.route("/capture/set", methods=["PUT"])
def setCapture() -> Response:
	data = request.get_json()
	if data is None:
		return Response(None, 400)

	simdata = Sim(session)
	print(data)
	simdata.capture = CaptureParameters.from_json(data)
	print(simdata.capture)
	return Response(None, 200)


@bp.route("/capture/get")
def getCapture() -> Response:
	simdata = Sim(session)
	response = simdata.capture
	return jsonify(response)


@bp.route("/capture/preview/get")
def getPreview() -> dict:
	sim = Sim(session)
	projections = sim.allProjections()
	print(f"{projections.nbytes/1000/1000}=")

	# Sending the animation as gifs are too large, and therefore don't work properly.
	# Instead, we will create a video file in-memory and use flask to serve it.
	video = asMp4Str(projections)

	print(f"Created {video.__sizeof__()/1024:.2f}kb capture video.")
	return {
		"height": projections[0].shape[0],
		"width": projections[0].shape[1],
		"gif_str": video,
	}

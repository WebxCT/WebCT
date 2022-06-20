from base64 import b64encode
from pathlib import Path
import tempfile
import io
from flask import jsonify, request, session
from flask.wrappers import Response
import numpy as np
from webct.blueprints.capture import bp
from webct.components.Capture import CaptureParameters
from webct.components.sim.SimSession import Sim
import imageio.v3 as iio


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


def asVideo(array: np.ndarray) -> str:
	print("Generating files from array")
	# First, compress capture to be 0-255
	print("normalising array")
	array = ((array - array.min()) / (array.max() - array.min()) * 255).astype("uint8")
	duration = 10
	fps = array.shape[0] / duration
	byteStream = io.BytesIO()
	with tempfile.TemporaryDirectory() as d:
		dir = Path(d)
		iio.imwrite(dir / "capture.mp4", array, macro_block_size=1, fps=fps)
		# optimize(dir/"capture.gif")
		with open(dir / "capture.mp4", "rb") as f:
			byteStream.write(f.read())

	byteStream.seek(0)
	return str(b64encode(byteStream.read()))[2:-1]


@bp.route("/capture/preview/get")
def getPreview() -> dict:
	sim = Sim(session)
	projections = sim.allProjections()

	# Sending the animation as gifs are too large, and therefore don't work properly.
	# Instead, we will create a video file in-memory and use flask to serve it.
	video = asVideo(projections)

	print(f"Created {video.__sizeof__()/1024:.2f}kb capture video.")
	return {
		"height": projections[0].shape[0],
		"width": projections[0].shape[1],
		"gif_str": video,
	}

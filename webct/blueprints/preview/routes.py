from datetime import datetime
from typing import List

from flask import jsonify, session, request, send_file, send_from_directory
from flask.wrappers import Response
from PIL import Image
import numpy as np
from webct.blueprints.preview import bp
from webct.components.imgutils import asPngStr
from webct.components.sim.Download import DownloadResource, DownloadStatus, ResourceFormat, ResourceType
from webct.components.sim.Quality import Quality
from webct.components.sim.SimSession import Sim


def saveGif(array: np.ndarray) -> None:
	array = (array - array.min()) / (array.max() - array.min())
	array = (array * 255).astype("uint8")

	# Create images
	images: List[Image.Image] = []
	for i in range(0, array.shape[0]):
		images.append(Image.fromarray(array[i]))

	images[0].save("projections.gif", "GIF", append_images=images[1:], duration=10, loop=0)

@bp.route("/sim/preview/get")
def getPreviews() -> Response:
	then = datetime.now()
	sim = Sim(session)

	projection = sim.projection(Quality.MEDIUM)
	projectionstr = asPngStr(projection)

	layout = sim.layout()
	layoutstr = asPngStr(layout)

	scene = sim.scene()
	scenestr = asPngStr(scene)

	return jsonify(
		{
			"time": f"{(then-datetime.now()).total_seconds()}",
			"projection": {
				"image": projectionstr,
				"height": projection.shape[0],
				"width": projection.shape[1],
			},
			"layout": {
				"image": layoutstr,
				"height": layout.shape[0],
				"width": layout.shape[1],
			},
			"scene": {
				"image": scenestr,
				"height": scene.shape[0],
				"width": scene.shape[1],
			}
		}
	)

@bp.route("/sim/download/prep", methods=["PUT"])
def getDownloadPrepare():
	print("Download prepare()")
	data = request.get_json()
	if data is None:
		data = {"resource":"ALL_PROJECTIONS","format":"TIFF_ZIP"}
		# return Response(None, 400)

	sim = Sim(session)
	resource = DownloadResource.from_json(data)


	# Prepare step is blocking...
	if not sim.download.prepare(resource):
		return Response(None, 500)

	# Data is prepared and ready to download from the get endpoint...
	return Response(None, 200)


@bp.route("/sim/download/status", methods=["GET"])
def getDownloadStatus() -> Response:
	sim = Sim(session)
	status = sim.download.status

	if status == DownloadStatus.DONE:
		return Response(status.value, 200)
	elif status == DownloadStatus.SIMULATING or DownloadStatus.PACKAGING:
		return Response(status.value, 425)
	return Response(DownloadStatus.WAITING.value, 400)


@bp.route("/sim/download/", methods=["GET"])
def getDownload() -> Response:
	data = request.get_json()
	if data is None:
		data = {"resource":"ALL_PROJECTIONS","format":"TIFF_ZIP"}

	resource = DownloadResource.from_json(data)

	sim = Sim(session)
	print(sim.download.location(resource))

	if sim.download.status == DownloadStatus.DONE:
		send_file(sim.download.location(resource).absolute())

	return Response(None, 400)

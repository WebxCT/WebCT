from base64 import b64encode
import io
from datetime import datetime
from typing import List

from flask import jsonify, session
from flask.wrappers import Response
from PIL import Image
import numpy as np
from webct.blueprints.preview import bp
from webct.components.sim.Quality import Quality
from webct.components.sim.SimSession import Sim
from medpy.io import save

def saveGif(array:np.ndarray) -> None:
	array = (array - array.min()) / (array.max() - array.min())
	array = (array * 255).astype("uint8")

	# Create images
	images:List[Image.Image] = []
	for i in range(0, array.shape[0]):
		images.append(Image.fromarray(array[i]))

	images[0].save("projections.gif", "GIF", append_images=images[1:], duration=10, loop=0)

def AsPng(array:np.ndarray) -> str:
	array = (array - array.min()) / (array.max() - array.min())
	array = (array * 255).astype("uint8")

	byteStream = io.BytesIO()
	img = Image.fromarray(array)
	img.save(byteStream, "PNG")
	byteStream.seek(0)
	return str(b64encode(byteStream.read()))[2:-1]

@bp.route("/sim/preview/get")
def getPreviews() -> Response:
	then = datetime.now()
	sim = Sim(session)

	# projections = sim.allProjections(Quality.MEDIUM)
	# gifstr = AsGif(projections)

	# recon = sim.getReconstruction(Quality.MEDIUM)
	# # Add extra channel to reconstruction for image exporting
	# recon = recon[..., np.newaxis]
	# save(recon, "recon.mha")
	projection = sim.projection(Quality.MEDIUM)
	projectionstr = AsPng(projection)

	layout = sim.layout()
	layoutstr = AsPng(layout)

	return jsonify(
		{
			"time":f"{(then-datetime.now()).total_seconds()}",
			# "capture": {
			# 	"image":gifstr,
			# 	"height":projections[0].shape[0],
			# 	"width":projections[0].shape[1],
			# },
			"projection": {
				"image":projectionstr,
				"height":projection.shape[0],
				"width":projection.shape[1],
			},
			"layout": {
				"image":layoutstr,
				"height":layout.shape[0],
				"width":layout.shape[1],
			},
		}
	)

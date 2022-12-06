from flask import jsonify, request, session
from flask.wrappers import Response
import numpy as np
from webct.blueprints.reconstruction import bp
from webct.components.Reconstruction import ReconstructionFromJson, asSinogram
from webct.components.imgutils import asPngStr, asMp4Str
from webct.components.sim.SimSession import Sim


@bp.route("/recon/set", methods=["PUT"])
def setReconParams() -> Response:
	data = request.get_json()
	if data is None:
		return Response(None, 400)

	simdata = Sim(session)
	print(data)
	simdata.recon = ReconstructionFromJson(data)
	print(simdata.recon)
	return Response(None, 200)


@bp.route("/recon/get")
def getReconParams() -> Response:
	simdata = Sim(session)
	response = simdata.recon
	return jsonify(response)


def createSliceVideo(array: np.ndarray) -> str:
	arr = np.zeros((array.shape[0], array.shape[0], array.shape[1]))

	# Broadcast projection into time
	np.copyto(arr, ((array - array.min()) / (array.max() - array.min()) * 255).astype("uint8"))

	arr = arr[..., None]
	print(arr.shape)

	# Broadcast grayscale to rbg
	arr = np.concatenate((arr, arr, arr), axis=3)
	print(arr.shape)

	# For each frame, add a red line moving vertically downwards
	for i in range(array.shape[0]):
		arr[i, i, :] = np.array((255, 0, 0))

	return asMp4Str(arr)


@bp.route("/recon/preview/get")
def getReconstruction() -> dict:
	simdata = Sim(session)
	recon = simdata.getReconstruction()

	reconVideo = asMp4Str(recon)
	proj = simdata.projection()
	sliceVideo = createSliceVideo(proj)
	sino = asSinogram(simdata.allProjections(), simdata.capture, simdata.beam, simdata.detector)
	sinoVideo = asMp4Str(sino)

	reconSlice = recon[recon.shape[0]//2]
	reconSliceStr = asPngStr(reconSlice)

	print(f"Created {reconVideo.__sizeof__()/1024:.2f}kb recon video.")
	print(f"Created {sliceVideo.__sizeof__()/1024:.2f}kb slice video.")
	print(f"Created {sinoVideo.__sizeof__()/1024:.2f}kb sinogram video.")

	return {
		"recon": {
			"video": reconVideo,
			"height": recon[0].shape[0],
			"width": recon[0].shape[1],
		},
		"slice": {
			"video": sliceVideo,
			"height": proj.shape[0],
			"width": proj.shape[1],
		},
		"sino": {
			"video": sinoVideo,
			"height": sino[0].shape[0],
			"width": sino[0].shape[1],
		},
		"centreSlice": {
			"image": reconSliceStr,
			"height": reconSlice.shape[0],
			"width": reconSlice.shape[1]
		}
	}

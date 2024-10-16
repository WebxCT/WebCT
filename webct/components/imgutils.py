import imageio.v3 as iio
import numpy as np
from base64 import b64encode
import io
import tempfile
from pathlib import Path
from PIL import Image
import logging as log

def asPngStr(array: np.ndarray) -> str:
	# naive way;- reallocates array
	# array = (array - array.min()) / (array.max() - array.min())
	# array = (array * 255).astype("uint8")

	# process per-frame to avoid large memory overhead
	min = array.min()
	max = array.max()
	offset = max - min
	compressed = np.empty_like(array, dtype=np.uint8)

	for row in range(array.shape[0]):
		compressed[row] = (((array[row] - min) / offset) * 255).astype(np.uint8)


	byteStream = io.BytesIO()
	img = Image.fromarray(compressed)
	img.save(byteStream, "PNG")
	byteStream.seek(0)
	return str(b64encode(byteStream.read()))[2:-1]



def asMp4Str(array: np.ndarray) -> str:
	# First, compress capture to be 0-255
	# array = ((array - array.min()) / (array.max() - array.min()) * 255).astype("uint8")

	# process per-frame to avoid large memory overhead
	min = array.min()
	max = array.max()
	offset = max - min
	compressed = np.empty_like(array, dtype=np.uint8)

	for row in range(array.shape[0]):
		compressed[row] = (((array[row] - min) / offset) * 255).astype(np.uint8)

	# Expand dimensions to all be even
	newShape = [[0,0]]
	for i in range(1, len(compressed.shape)):
		newShape.append([0,compressed.shape[i] % 2])
	compressed = np.pad(compressed, newShape)

	duration = 10
	fps = compressed.shape[0] / duration
	byteStream = io.BytesIO()
	with tempfile.TemporaryDirectory() as d:
		dir = Path(d)
		iio.imwrite(dir / "capture.mp4", compressed, macro_block_size=1, fps=fps)
		# optimize(dir/"capture.gif")
		with open(dir / "capture.mp4", "rb") as f:
			byteStream.write(f.read())

	byteStream.seek(0)
	return str(b64encode(byteStream.read()))[2:-1]

def asDisplaySinogram(projections: np.ndarray) -> np.ndarray:
	"""Create a sinogram for display purposes, using normalized uint8."""
	projections = projections.transpose([1, 0, 2])

	# prepare bounds
	min = np.log(projections.min() + 1e-5) * -1
	max = np.log(projections.max()) * -1
	offset = max - min

	sinogram = np.empty_like(projections, dtype=np.uint8)
	workspace = np.empty_like(projections[0], dtype=np.float32)
	for row in range(projections.shape[0]):
		workspace = np.copy(projections[row])
		np.clip(workspace, a_min=1e-5, a_max=None, out=workspace)
		np.log(workspace, workspace)
		np.negative(workspace, workspace)
		sinogram[row] = (((projections[row] - min) / offset) * 255).astype(np.uint8)

	return sinogram
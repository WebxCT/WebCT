import imageio.v3 as iio
import numpy as np
from base64 import b64encode
import io
import tempfile
from pathlib import Path
from PIL import Image

def asPngStr(array: np.ndarray) -> str:
	array = (array - array.min()) / (array.max() - array.min())
	array = (array * 255).astype("uint8")

	byteStream = io.BytesIO()
	img = Image.fromarray(array)
	img.save(byteStream, "PNG")
	byteStream.seek(0)
	return str(b64encode(byteStream.read()))[2:-1]


def asMp4Str(array: np.ndarray) -> str:
	print("Generating files from array")
	# First, compress capture to be 0-255
	print("normalising array")
	array = ((array - array.min()) / (array.max() - array.min()) * 255).astype("uint8")

	# Expand dimensions to all be even
	newShape = [[0,0]]
	for i in range(1, len(array.shape)):
		newShape.append([0,array.shape[i] % 2])
	array = np.pad(array, newShape)

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

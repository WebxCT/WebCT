import json
import traceback
from typing import Dict, List, Optional
from flask import jsonify, request, session
from flask.wrappers import Response
from werkzeug.utils import secure_filename
from webct.blueprints.samples import bp
from pathlib import Path
from webct.components.Material import MaterialEncoder, MaterialFromJson, MATERIALS
from webct.components.Samples import Sample

from webct.components.sim.SimSession import Sim

from webct import model_folder, material_folder


def add_material_file(category: str, file: Path) -> Optional[str]:
	if file.name[0] == ".":
		return
	if file.absolute().name[-4:] == "json":
		with file.open("r") as f:
			try:
				j = json.load(f)
				mat = MaterialFromJson(j)

				if category not in MATERIALS:
					# We may be called without the category existing.
					MATERIALS[category] = {}
					if mat.label in MATERIALS[category]:
						raise TypeError(f"Cannot import {file} as '{mat.label}' is already loaded.")
				print(f"Imported {category}/{file.name[:-5]}")
				MATERIALS[category][file.name[:-5]] = mat
				return file.name[:-5]
			except Exception as e:
				traceback.print_exception(type(e), e, e.__traceback__)
				print(f"fail to import: {file.name}: {type(e)}: {e}")
				return


def add_folder(folder: Path) -> None:
	if not folder.is_dir():
		return

	category = f"{folder.relative_to(material_folder)}".lower()
	MATERIALS[category] = {}

	for file in folder.iterdir():
		if file.is_dir():
			if not file.name[0] == ".":
				add_folder(file)
		else:
			add_material_file(category, file)
	return


def preloadMaterials() -> None:
	folder = Path(material_folder)
	if not folder.exists():
		folder.mkdir()

	add_folder(folder)

	# Enumerate contents in data folder
	print(f"Loaded {len(MATERIALS)} materials categories.")


@bp.route("/samples/list", methods=["GET"])
def getSampleList() -> Response:
	folder = Path(model_folder)
	if not folder.exists():
		folder.mkdir()
	elif not folder.is_dir():
		return Response(None, 500)

	files: Dict[str, List[str]] = {}
	files["files"] = []

	# Enumerate contents in data folder
	for file in folder.iterdir():
		files["files"].append(file.name)

	return jsonify(files)


@bp.route("/samples/get", methods=["GET"])
def getSample() -> Response:
	# Get the currently loaded samples and their statistics

	simdata = Sim(session)
	samples = {}
	samples["samples"] = []
	for sample in simdata.samples:
		samples["samples"].append(sample.to_json())

	return jsonify(samples)


@bp.route("/samples/set", methods=["PUT"])
def setSamples() -> Response:
	# Load samples
	data = request.get_json()
	if data is None:
		return Response(None, 400)
	simdata = Sim(session)

	# Create a set of modelpaths so we can avoid re-adding models
	samples: List[Sample] = []
	for sample in data["samples"]:
		samples.append(Sample.from_json(sample))

	simdata.samples = tuple(samples)
	return Response(None, 200)


@bp.route("/samples/upload", methods=["POST"])
def uploadModel() -> Response:
	# upload model
	if "file" not in request.files:
		return Response(None, 400)
	file = request.files["file"]
	if file.filename is None or file.filename == "":
		# no file?
		return Response(None, 400)
	if file and file.filename.split(".")[-1] == "stl":
		filename = secure_filename(file.filename)
		path = Path(model_folder + filename)
		if path.exists():
			# don't allow overwriting for now...
			return Response(None, 400)
		file.save(path)
		return Response(None, 200)
	return Response(None, 400)


@bp.route("/material/list", methods=["GET"])
def getMaterialList() -> Response:
	# Use a custom encoder for dumping materials.
	result = json.dumps(MATERIALS, cls=MaterialEncoder)
	return Response(result, 200, mimetype="application/json")


@bp.route("/material/set", methods=["PUT"])
def setMaterial() -> Response:
	# set a material
	data = request.get_json()

	if data is None:
		return Response(None, 400)
	if "category" not in data:
		return Response(None, 400)

	# get just the material data
	material = data.copy()
	del material["category"]
	material = MaterialFromJson(material)

	# Clean category and label for filepath usage
	cat = Path(secure_filename(data["category"]))
	file = Path(secure_filename(data["label"].lower())).with_suffix(".json")

	# check to see if the folder
	orPath = Path(material_folder) / cat / file

	if not orPath.is_relative_to(material_folder):
		return Response(None, 400)

	nPath = orPath
	if not (orPath.exists() and orPath.is_file()):
		# path is not pointing to an existing material
		fname = secure_filename(orPath.name)
		nPath = orPath.with_name(fname)
		if nPath.resolve().is_relative_to(Path(material_folder).resolve()):
			# create path
			nPath.touch()
		else:
			return Response(None, 400)

	with nPath.open("w") as f:
		json.dump(material.to_json(), f, indent="\t")

	matID = add_material_file(str(cat), nPath)
	print(f"New Material ID: {cat}/{matID}")

	return jsonify({"catID":str(cat),"matID":str(matID)})

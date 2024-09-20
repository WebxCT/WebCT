import json
import traceback
from typing import Dict, List, Optional
from flask import jsonify, request, session
from flask.wrappers import Response
from werkzeug.utils import secure_filename
from webct.blueprints.samples import bp
from pathlib import Path
from webct.components.Material import MaterialEncoder, MaterialFromJson, MATERIALS
from webct.components.Samples import Sample, SampleSettings

from webct.components.sim.SimSession import Sim
import logging as log

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
				MATERIALS[category][file.name[:-5]] = mat
				return file.name[:-5]
			except Exception as e:
				traceback.print_exception(type(e), e, e.__traceback__)
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

	log.info(f"Recursively Loading materials from '{folder}'")
	add_folder(folder)

	i = 0
	for key, value in MATERIALS.items():
		i += len(value.keys())

	log.info(f"Collated and parsed {i} materials in {len(MATERIALS.keys())} categorys.")


@bp.route("/samples/list", methods=["GET"])
def getModelList() -> Response:
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
	return jsonify(simdata.samples)


@bp.route("/samples/set", methods=["PUT"])
def setSamples() -> Response:
	# Load samples
	data = request.get_json()
	if data is None:
		return Response(None, 400)
	simdata = Sim(session)

	# Create a set of modelpaths so we can avoid re-adding models
	samples = SampleSettings.from_json(data)
	simdata.samples = samples
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
			log.warning(f"Unable to upload '{path}'; model already exists.")
			return Response(None, 400)
		log.info(f"Uploading new model to '{path}'")
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
	cat = Path(secure_filename(data["category"].lower()))
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
			# Create category folder if not existing
			if not nPath.parent.exists():
				nPath.parent.mkdir()
			nPath.touch()
			log.info(f"Created new material file at '{nPath}")
		else:
			# material file out of bounds; ignore.
			return Response(None, 400)

	with nPath.open("w") as f:
		json.dump(material.to_json(), f, indent="\t")

	matID = add_material_file(str(cat), nPath)

	return jsonify({"catID":str(cat),"matID":str(matID)})

@bp.route("/material/delete", methods=["DELETE"])
def deleteMaterial() -> Response:
	data = request.get_json()
	if data is None:
		return Response(None, 400)
	if "categoryID" not in data:
		return Response(None, 400)
	if "materialID" not in data:
		return Response(None, 400)

	catID = data["categoryID"]
	matID = data["materialID"]

	if (catID not in MATERIALS) or (matID not in MATERIALS[catID]):
		# Material ID does not exist; so it's deleted.
		return Response(None, 200)

	log.info(f"Deleting material {catID}/{matID}")

	mat = MATERIALS[catID][matID]

	cat = Path(secure_filename(catID.lower()))
	file = Path(secure_filename(mat.label.lower())).with_suffix(".json")

	# check to see if the folder is relative
	orPath = Path(material_folder) / cat / file

	if not orPath.is_relative_to(material_folder):
		return Response(None, 400)

	if (orPath.exists() and orPath.is_file()):
		# Path exists
		orPath.unlink()
	else:
		# Default path doesn't exist, get one for the material
		fname = secure_filename(orPath.name)
		nPath = orPath.with_name(fname)
		if nPath.resolve().is_relative_to(Path(material_folder).resolve()):
			nPath.unlink()
		else:
			return Response(None, 400)

	del MATERIALS[catID][matID]
	return Response(None, 200)

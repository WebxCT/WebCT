from flask import send_file
from webct.blueprints.twins import bp
from flask.wrappers import Response
from webct.components.Twin import TWINS, twin_from_file
from pathlib import Path
import logging as log
from webct import twin_folder

def preloadTwins() -> None:
	folder = Path(twin_folder)
	if not folder.exists():
		# issues creating twin folder, no twins defined! make a folder anyway
		# and we return an empty twin list, frontend will disable digital twin
		# features.
		folder.mkdir()
		log.warning("Twin folder does not exist, no twins will be loaded.")
		return

	log.info(f"Loading twins from '{twin_folder}'")
	i = 0
	for file in folder.rglob("*.json5"):
		try:
			twin = twin_from_file(file)
			TWINS[twin.name] = twin
			i += 1
			log.debug(f"Loaded twin '{twin.name}' from '{file.name}'")
		except (KeyError, ValueError) as e:
			log.warning(f"Failed to load '{file.name}': {e}")
			continue
	print(f"Loaded {i} twins.")

@bp.route("/twins/list", methods=["GET"])
def getTwinList() -> Response:

	return TWINS # type: ignore

@bp.route("/twins/img/<path:path>", methods=["GET"])
def serveTwinImages(path:str):

	name = Path(path).absolute().name
	return send_file(Path(twin_folder).resolve() / "img" / Path(name))

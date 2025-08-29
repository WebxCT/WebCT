from pathlib import Path

from flask import send_file
from flask.wrappers import Response

from webct import twin_folder
from webct.blueprints.twins import bp
from webct.components.Twin import get_twins


@bp.route("/twins/list", methods=["GET"])
def getTwinList() -> Response:
	return get_twins()


@bp.route("/twins/img/<path:path>", methods=["GET"])
def serveTwinImages(path: str):
	name = Path(path).absolute().name
	return send_file(Path(twin_folder).resolve() / "img" / Path(name))

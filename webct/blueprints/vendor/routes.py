from flask import send_from_directory
from flask.wrappers import Response

from webct.blueprints.vendor import bp


@bp.route("/v/<path:path>")
def vendorFiles(path: str) -> Response:
	"""Javascript base file."""
	return send_from_directory(bp.static_folder, path)

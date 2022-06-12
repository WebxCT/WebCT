from flask.wrappers import Response
from webct.blueprints.shoelace import bp

@bp.route("/shoelace/<path>")
def shoelaceFiles() -> Response:
	"""Javascript base file."""
	return bp.send_static_file("js/base.js")

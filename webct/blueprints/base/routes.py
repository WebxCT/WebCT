from flask.wrappers import Response
from webct.blueprints.base import bp

@bp.route("/js/base.js")
def js_base() -> Response:
	"""Javascript base file."""
	return bp.send_static_file("js/base.js")

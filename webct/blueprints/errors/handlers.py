from typing import Tuple

from flask import render_template
from flask.wrappers import Response
from werkzeug.exceptions import HTTPException
from webct.blueprints.errors import bp


@bp.app_errorhandler(HTTPException)
def error_http(error: HTTPException) -> Tuple[str, int]:
	"""Error handler HTTP errors."""
	return (
		render_template(
			"error.html.j2",
			error={
				"name": error.name,
				"code": error.code,
				"description": error.description,
			},
		),
		error.code if error.code is not None else 500,
	)

@bp.route("/js/errors.js")
def js_errors() -> Response:
	"""Javascript for error pages."""
	return bp.send_static_file("js/errors.b.js")

from flask.templating import render_template
from flask.wrappers import Response
from flask import session
from webct.blueprints.app import bp

@bp.route("/js/app.js")
def js_app() -> Response:
	"""Javascript app file."""
	return bp.send_static_file("js/app.b.js")

@bp.route("/css/app.css")
def css_app() -> Response:
	"""Javascript app file."""
	return bp.send_static_file("css/app.css")

@bp.route("/")
def html_app_list() -> str:
	"""App html file."""
	session.permanent = True
	return render_template("main.html.j2")


# ======================================================== #
# ======================= Favicons ======================= #
# ======================================================== #

# Why can't browsers decide on a standard already...

@bp.route("/favicon.ico")
def favicon() -> Response:
	return bp.send_static_file("img/favicons/favicon.ico")

@bp.route("/android-chrome-192x192.png")
def favicon_android_192() -> Response:
	return bp.send_static_file("img/favicons/android-chrome-192x192.png")

@bp.route("/android-chrome-512x512.png")
def favicon_android_512() -> Response:
	return bp.send_static_file("img/favicons/android-chrome-512x512.png")

@bp.route("/apple-touch-icon.png")
def favicon_apple() -> Response:
	return bp.send_static_file("img/favicons/apple-touch-icon.png")

@bp.route("/browserconfig.xml")
def favicon_browserconfig() -> Response:
	return bp.send_static_file("img/favicons/browserconfig.xml")

@bp.route("/favicon-16x16.png")
def favicon_16() -> Response:
	return bp.send_static_file("img/favicons/favicon-16x16.png")

@bp.route("/favicon-32x32.png")
def favicon_32() -> Response:
	return bp.send_static_file("img/favicons/favicon-32x32.png")

@bp.route("/mstile-70x70.png")
def favicon_mstile_70() -> Response:
	return bp.send_static_file("img/favicons/mstile-70x70.png")

@bp.route("/mstile-150x150.png")
def favicon_mstile_150() -> Response:
	return bp.send_static_file("img/favicons/mstile-150x150.png")

@bp.route("/mstile-310x310.png")
def favicon_mstile_310() -> Response:
	return bp.send_static_file("img/favicons/mstile-310x310.png")

@bp.route("/safari-pinned-tab.svg")
def favicon_safari() -> Response:
	return bp.send_static_file("img/favicons/safari-pinned-tab.svg")

@bp.route("/site.webmanifest")
def site_webmanifest() -> Response:
	return bp.send_static_file("img/favicons/site.webmanifest")

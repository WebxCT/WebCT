from flask import Blueprint

bp = Blueprint("capture", __name__)
bp.template_folder = "./templates/"
bp.static_folder = "./static/"

from webct.blueprints.capture import routes # noqa

from flask import Blueprint

bp = Blueprint("detector", __name__)
bp.template_folder = "./templates/"
bp.static_folder = "./static/"

from webct.blueprints.detector import routes # noqa

from flask import Blueprint

bp = Blueprint("preview", __name__)
bp.template_folder = "./templates/"
bp.static_folder = "./static/"

from webct.blueprints.preview import routes # noqa

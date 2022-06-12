from flask import Blueprint

bp = Blueprint("samples", __name__)
bp.template_folder = "./templates/"
bp.static_folder = "./static/"

from webct.blueprints.samples import routes # noqa

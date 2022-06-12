from flask import Blueprint

bp = Blueprint("beam", __name__)
bp.template_folder = "./templates/"
bp.static_folder = "./static/"

from webct.blueprints.beam import routes # noqa

from flask import Blueprint

bp = Blueprint("reconstruction", __name__)
bp.template_folder = "./templates/"
bp.static_folder = "./static/"

from webct.blueprints.reconstruction import routes # noqa

from flask import Blueprint

bp = Blueprint("base", __name__)
bp.template_folder = "./templates/"
bp.static_folder = "./static/"

from webct.blueprints.base import routes # noqa

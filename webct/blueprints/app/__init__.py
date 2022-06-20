from flask import Blueprint

bp = Blueprint("app", __name__)
bp.template_folder = "./templates/"
bp.static_folder = "./static/"

from webct.blueprints.app import routes # noqa

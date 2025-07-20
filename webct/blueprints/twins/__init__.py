from flask import Blueprint

bp = Blueprint("twins", __name__)
bp.template_folder = "./templates/"
bp.static_folder = "./static/"

from webct.blueprints.twins import routes # noqa

from flask import Blueprint

bp = Blueprint("shoelace", __name__)
bp.template_folder = "./templates/"
bp.static_folder = "../../node_modules/@shoelace-style/shoelace/dist/"

from webct.blueprints.shoelace import routes # noqa

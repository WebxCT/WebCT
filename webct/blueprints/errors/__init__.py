from flask import Blueprint

bp = Blueprint("errors", __name__)
bp.template_folder = "./templates/"
bp.static_folder = "./static/"

# Avoid circular dependencies
from webct.blueprints.errors import handlers # noqa

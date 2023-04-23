import os
import sys
from flask import Flask
from enum import IntEnum
import logging
from pathlib import Path

import matplotlib


# todo: move / replace
class Element(IntEnum):
	H = 1
	He = 2
	Li = 3
	Be = 4
	B = 5
	C = 6
	N = 7
	O = 8
	F = 9
	Ne = 10
	Na = 11
	Mg = 12
	Al = 13
	Si = 14
	P = 15
	S = 16
	Cl = 17
	Ar = 18
	K = 19
	Ca = 20
	Sc = 21
	Ti = 22
	V = 23
	Cr = 24
	Mn = 25
	Fe = 26
	Co = 27
	Ni = 28
	Cu = 29
	Zn = 30
	Ga = 31
	Ge = 32
	As = 33
	Se = 34
	Br = 35
	Kr = 36
	Rb = 37
	Sr = 38
	Y = 39
	Zr = 40
	Nb = 41
	Mo = 42
	Tc = 43
	Ru = 44
	Rh = 45
	Pd = 46
	Ag = 47
	Cd = 48
	In = 49
	Sn = 50
	Sb = 51
	Te = 52
	I = 53
	Xe = 54
	Cs = 55
	Ba = 56
	La = 57
	Ce = 58
	Pr = 59
	Nd = 60
	Pm = 61
	Sm = 62
	Eu = 63
	Gd = 64
	Tb = 65
	Dy = 66
	Ho = 67
	Er = 68
	Tm = 69
	Yb = 70
	Lu = 71
	Hf = 72
	Ta = 73
	W = 74
	Re = 75
	Os = 76
	Ir = 77
	Pt = 78
	Au = 79
	Hg = 80
	Tl = 81
	Pb = 82
	Bi = 83
	Po = 84
	At = 85
	Rn = 86
	Fr = 87
	Ra = 88
	Ac = 89
	Th = 90
	Pa = 91
	U = 92
	Np = 93
	Pu = 94
	Am = 95
	Cm = 96
	Bk = 97
	Cf = 98
	Es = 99
	Fm = 100
	Md = 101
	No = 102
	Lr = 103
	Rf = 104
	Db = 105
	Sg = 106
	Bh = 107
	Hs = 108
	Mt = 109
	Ds = 110
	Rg = 111
	Cn = 112
	Nh = 113
	Fl = 114
	Mc = 115
	Lv = 116
	Ts = 117
	Og = 118


if getattr(sys, 'frozen', False) and hasattr(sys, '_MEIPASS'):
	# use template and static folders from
	template_folder = os.path.join(sys._MEIPASS, 'templates') # pylint: disable=no-member
	static_folder = os.path.join(sys._MEIPASS, 'static') # pylint: disable=no-member
	app = Flask(__name__, template_folder=template_folder, static_folder=static_folder)
else:
	app = Flask(__name__)

app.secret_key = os.urandom(24)

# Enforce backend to avoid QT crashes
matplotlib.use("Agg")

# Setup logging hooks
logger = logging.getLogger("werkzeug")
# Steam to std.err / std.out
logger.addHandler(logging.StreamHandler())

# Although these should be paths, they need to be string constants for
# multiprocess communication.
model_folder = "./data/models/"
material_folder = "./data/materials/"

# technically folders could be created, but if they don't
# exist then the default configuration would also fail.
# ideally we should fail earlier with an error message
if not Path(model_folder).parent.exists():
	logger.error(f"Unable to locate existing data folder, did you remember to copy it? Could not find {Path(model_folder).parent}\nThis folder contains required defaults used by WebCT during initialisation.")
	try:
		# in windows, display an alert box, otherwise the console will close abruptly
		# force close splash screen if it exists, since the messagebox can get stuck underneath it
		try:
			import pyi_splash as splash
			splash.close()
		except:
			pass
		import ctypes
		ctypes.windll.user32.MessageBoxW(0, "WebCT failed to start because of a missing data folder. Please ensure the data folder exists in the same location as this executable.", "Failed to start WebCT", 0x0+0x10+0x1000+0x10000 )
	except:
		pass
# os.makedirs(Path(model_folder), exist_ok=True)
# os.makedirs(Path(material_folder), exist_ok=True)

# ! Unfortunately, redirecting logging to files doesn't actually work correctly
# try:
# 	os.mkdir("logs")
# 	logger.addHandler(logging.FileHandler(f"logs/{datetime.now().strftime('%b-%d-%Y-%H-%M-%S')}.log"))
# except OSError as exc:
# 	if exc.errno == errno.EEXIST:
# 		# Folder already existed, add log
# 		logger.addHandler(logging.FileHandler(f"logs/{datetime.now().strftime('%b-%d-%Y-%H-%M-%S')}.log"))
# 	else:
# 		# We had other issues trying to make a folder, don't bother trying to
# 		# save logs...
# 		logger.error("Unable to make log directory, will not log to files!")

# - Blueprint registration - #

# Base pages
from webct.blueprints.base import bp as base_bp # noqa
app.register_blueprint(base_bp)

# Error pages
from webct.blueprints.errors import bp as errors_bp # noqa
app.register_blueprint(errors_bp)

# App page
from webct.blueprints.app import bp as app_bp # noqa
app.register_blueprint(app_bp)

# Beam API
from webct.blueprints.beam import bp as beam_bp # noqa
app.register_blueprint(beam_bp)

# Detector API
from webct.blueprints.detector import bp as detector_bp # noqa
app.register_blueprint(detector_bp)

# Samples API
from webct.blueprints.samples import bp as samples_bp # noqa
app.register_blueprint(samples_bp)

# load sample materials
from webct.blueprints.samples.routes import preloadMaterials # noqa
preloadMaterials()

# Capture API
from webct.blueprints.capture import bp as capture_bp # noqa
app.register_blueprint(capture_bp)

# Reconstruction API
from webct.blueprints.reconstruction import bp as reconstruction_bp # noqa
app.register_blueprint(reconstruction_bp)

# Preview API
from webct.blueprints.preview import bp as preview_bp # noqa
app.register_blueprint(preview_bp)

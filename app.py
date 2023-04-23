import multiprocessing
import webbrowser
from threading import Timer
splash = None
try:
	import pyi_splash as splash
except:
	pass

def open_browser():
	webbrowser.open("http://localhost:2742", 2)
	if splash is not None:
		splash.close()


if __name__ == "__main__":
	multiprocessing.freeze_support()
	if splash is not None:
		try:
			splash.update_text("Starting Server...")
		except:
			# may fail due to no splash screen, but we don't care.
			pass
	from webct import app # noqa
	Timer(1, open_browser).start()
	app.run(port=2742)

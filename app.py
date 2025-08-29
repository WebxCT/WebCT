import contextlib
import multiprocessing
import webbrowser
from threading import Timer

splash = None
with contextlib.suppress(Exception):
	import pyi_splash as splash


def open_browser() -> None:
	# For some reason, "localhost" may fail on chrome in certain conditions.
	# I've never been able to reproduce this, however multiple users on github
	# have reported the problem.
	webbrowser.open("http://127.0.0.1:2742", 2)
	if splash is not None:
		splash.close()


if __name__ == "__main__":
	multiprocessing.freeze_support()
	if splash is not None:
		with contextlib.suppress(Exception):
			splash.update_text("Starting Server...")
	from webct import app

	Timer(1, open_browser).start()
	app.run(port=2742)

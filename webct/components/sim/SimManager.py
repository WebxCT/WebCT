from threading import Semaphore
from random import Random
from webct.components.sim.clients.SimClient import SimClient
import logging as log

processes: dict[int, SimClient] = {}
rng = Random()
lock = Semaphore()


def getClient(session, sid:int) -> SimClient:
	with lock:
		if "tid" not in session:
			tid = rng.randint(0, 10000)
			while tid in processes:
				tid = rng.randint(0, 10000)
			session["tid"] = tid
		tid = session["tid"]
		if tid in processes:
			thread: SimClient = processes[tid]
			if thread.is_alive():
				return thread
			else:
				log.warning(f"Expected a process {thread.pid}, but it was dead")

		# SimClient is passed the session ID for logging purposes.
		processes[tid] = SimClient(sid)
		processes[tid].start()
		return processes[tid]

from threading import Semaphore
from random import Random
from webct.components.sim.clients.SimClient import SimClient

processes: dict[int, SimClient] = {}
rng = Random()
lock = Semaphore()


def getClient(session) -> SimClient:
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
				print(f"Expected a process {thread.pid}, but it was dead")

		processes[tid] = SimClient()
		processes[tid].start()
		return processes[tid]

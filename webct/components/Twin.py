from __future__ import annotations

import logging as log
from pathlib import Path

import json5
from gvxrPython3 import twins

from webct import twin_folder

WEBCT_TWINS = []
GVXR_TWINS = twins.getDigitalTwinList()

TWIN_DICT: dict[str, twins.DigitalTwin] = {}

# ======================================================== #


def preloadTwins() -> None:
	folder = Path(twin_folder)
	if not folder.exists():
		folder.mkdir()
		return

	log.info(f"Loading twins from '{twin_folder}'")
	i = 0

	for file in folder.rglob("*.json5"):
		try:
			with file.open("r") as f:
				twin_json = json5.load(f)

			name_taken = False
			for twin in GVXR_TWINS:
				if twin["name"] == twin_json["name"] or twin["name"] == "none":
					name_taken = True
					break
			if not name_taken:
				for twin in WEBCT_TWINS:
					if twin["name"] == twin_json["name"] or twin["name"] == "none":
						name_taken = True
						break

			if name_taken:
				log.warning(f"Failed to load '{twin_json['name']}', twin with the same name already exists.")
				continue

			WEBCT_TWINS.append(twin_json)
			i += 1
			log.debug(f"Loaded twin '{twin_json.name}' from '{file.name}'")
		except (KeyError, ValueError) as e:
			log.warning(f"Failed to load '{file.name}': {e}")
			continue
	log.info(f"Loaded {i} twins.")


def get_twins() -> dict[str, twins.DigitalTwin]:
	global TWIN_DICT
	if TWIN_DICT != {}:
		return TWIN_DICT

	TWIN_DICT = {}
	for twin in GVXR_TWINS + WEBCT_TWINS:
		TWIN_DICT[twin["name"]] = twin
	return TWIN_DICT


def get_twin(twin: str) -> twins.DigitalTwin | None:
	twin = TWIN_DICT.get(twin)
	if twin is not None:
		return twins.DigitalTwin.from_json(twin)
	return None

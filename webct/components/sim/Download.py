
from dataclasses import dataclass
from enum import Enum
import os
from pathlib import Path
import tempfile
from typing import Optional
from webct.components.sim.Quality import Quality
import numpy as np
import tifffile as tf
from PIL import Image
from zipfile import ZipFile
import shutil
from datetime import datetime
import logging as log

# Circular import, so we can't do typing unless we refactor SimSession...
# from webct.components.sim.SimSession import SimSession
from os import makedirs

class ResourceType(Enum):
	PROJECTION = "PROJECTION"
	ALL_PROJECTION = "ALL_PROJECTIONS"
	RECON_SLICE = "RECON_SLICE"
	RECONSTRUCTION = "RECON"


class ResourceFormat(Enum):
	TIFF_STACK = "TIFF_STACK"
	TIFF_ZIP = "TIFF_ZIP"
	NUMPY = "NUMPY"
	JPEG = "JPEG"


@dataclass(frozen=True)
class DownloadResource():
	Resource:ResourceType
	Format:ResourceFormat

	@staticmethod
	def from_json(json:dict):
		if (
			"resource" not in json
			or "format" not in json
		):
			raise KeyError("Missing keys.")

		str(json["resource"])
		str(json["format"])

		resource = ResourceType(str(json["resource"]))
		frmt = ResourceFormat(str(json["format"]))

		return DownloadResource(resource, frmt)


class DownloadStatus(Enum):
	WAITING = "WAITING"
	SIMULATING = "SIMULATING"
	PACKAGING = "PACKAGING"
	DONE = "DONE"

class DownloadPrepper():

	@staticmethod
	def simulate(sim, resource:DownloadResource) -> bool:
		if not DownloadPrepper.checkCompat(resource):
			return False

		# Simulate request
		if resource.Resource == ResourceType.ALL_PROJECTION:
			sim.allProjections(quality=Quality.HIGH)

		elif resource.Resource == ResourceType.PROJECTION:
			sim.projection(quality=Quality.HIGH)

		elif resource.Resource == ResourceType.RECON_SLICE:
			sim.getReconstruction()

		elif resource.Resource == ResourceType.RECONSTRUCTION:
			sim.getReconstruction()

		return True

	@staticmethod
	def package(sim, resource:DownloadResource, location:Path) -> bool:
		if not DownloadPrepper.checkCompat(resource):
			return False

		if location.exists():
			try:
				os.remove(location.absolute())
			except:
				pass

		# Not sure why this doesn't always work?
		location.absolute().unlink(missing_ok=True)

		if resource.Format == ResourceFormat.NUMPY:
			npy = None
			if resource.Resource == ResourceType.RECON_SLICE:
				npy = sim.getReconstruction()
				npy = npy[npy.shape[0]//2]

			elif resource.Resource == ResourceType.ALL_PROJECTION:
				npy = sim.allProjections(quality=Quality.HIGH)

			elif resource.Resource == ResourceType.RECONSTRUCTION:
				npy = sim.getReconstruction()

			else:
			# elif resource.Resource == ResourceType.PROJECTION:
				npy = sim.projection(quality=Quality.HIGH)

			np.save(location, npy)
			return True

		elif resource.Format == ResourceFormat.TIFF_STACK:
			if resource.Resource == ResourceType.RECON_SLICE:
				recon = sim.getReconstruction()
				tf.imwrite(location, recon[recon.shape[0]//2])

			elif resource.Resource == ResourceType.PROJECTION:
				tf.imwrite(location, sim.projection(quality=Quality.HIGH))

			elif resource.Resource == ResourceType.ALL_PROJECTION:
				tf.imwrite(location, sim.allProjections(quality=Quality.HIGH))

			elif resource.Resource == ResourceType.RECONSTRUCTION:
				tf.imwrite(location, sim.getReconstruction(),imagej=True)
			else:
				return False

			return True

		elif resource.Format == ResourceFormat.JPEG:
			array = None

			if resource.Resource == ResourceType.RECON_SLICE:
				array = sim.getReconstruction()
				array = array[array.shape[0]//2]

			# elif resource.Resource == ResourceType.PROJECTION:
			else:
				array = sim.projection(quality=Quality.HIGH)

			array = (array - array.min()) / (array.max() - array.min())
			array = (array * 255).astype(np.uint8)

			Image.fromarray(array).save(location)
			return True

		elif resource.Format == ResourceFormat.TIFF_ZIP:
			if resource.Resource == ResourceType.RECONSTRUCTION:
				array = sim.getReconstruction()
			else:
				array = sim.allProjections(quality=Quality.HIGH)

			name = location.with_suffix("").name
			# For each slice, create a tiff image within a temporary folder, and write to a zip file
			with tempfile.TemporaryDirectory() as d:
				tmpPath = Path(d)
				zipPath = tmpPath / f"{name}.zip"
				with ZipFile(zipPath, "w") as z:
					for i in range(0, array.shape[0]):
						projPath = tmpPath / f"{name}-{i:04}.tiff"
						tf.imwrite(projPath, array[i])
						z.write(projPath, f"{name}-{i:04}.tiff")
						# if (i % (array.shape[0] // 10)) == 0:
						# 	log.info(f"Processed slice [{i: 4} / {array.shape[0]: 4}] ({i/array.shape[0]:.2%})")
				shutil.move(zipPath, location.parent)
			return True

		return False

	@staticmethod
	def checkCompat(resource:DownloadResource):

		# Single images
		if resource.Resource == ResourceType.PROJECTION or resource.Resource == ResourceType.RECON_SLICE:
			# Download supports single tiff, numpy, and jpeg
			if resource.Format == ResourceFormat.TIFF_STACK:
				return True
			if resource.Format == ResourceFormat.NUMPY:
				return True
			if resource.Format == ResourceFormat.JPEG:
				return True
			return False

		# Image sets
		if resource.Resource == ResourceType.ALL_PROJECTION or resource.Resource == ResourceType.RECONSTRUCTION:
			# All projections supports a hyperstack, zip, or numpy
			if resource.Format == ResourceFormat.TIFF_STACK or resource.Format == ResourceFormat.TIFF_ZIP:
				return True
			if resource.Format == ResourceFormat.NUMPY:
				return True
			return False


class DownloadManager:

	_working:bool
	_session:object
	_resource:DownloadResource
	_status:DownloadStatus
	_prepper:DownloadPrepper

	def __init__(self, sim) -> None:
		self._session = sim
		self._working = False
		self._status = DownloadStatus.WAITING
		self._result_path = None

	def prepare(self, resource:DownloadResource) -> bool:
		if self._working:
			return False
		else:
			# Check to see if download options are supported
			if not DownloadPrepper.checkCompat(resource):
				return False

			# Set resource
			self._resource = resource
			self._result_path = str(datetime.utcnow()).replace("-","").replace(":","").replace(" ","")

			# Simulate requested data
			self._status = DownloadStatus.SIMULATING

			self._working = True
			try:
				simmed = DownloadPrepper.simulate(self._session, self._resource)
			except Exception as e:
				simmed = False

			if not simmed:
				self._working = False
				self._status = DownloadStatus.WAITING
				return False

			# Package requested data
			self._status = DownloadStatus.PACKAGING

			path = self.location(resource)
			makedirs(path.parent, exist_ok=True)

			try:
				prepped = DownloadPrepper.package(self._session, self._resource, path)
			except Exception as e:
				prepped = False
			if not prepped:
				self._working = False
				self._status = DownloadStatus.WAITING

				return False

			# Done
			self._status = DownloadStatus.DONE
			self._working = False

			return True

	@property
	def status(self):
		return self._status

	def location(self, resource: DownloadResource):
		ext = ""
		name = ""
		if resource.Format == ResourceFormat.TIFF_STACK:
			ext = ".tiff"
		elif resource.Format == ResourceFormat.NUMPY:
			ext = ".npy"
		elif resource.Format == ResourceFormat.JPEG:
			ext = ".jpg"
		elif resource.Format == ResourceFormat.TIFF_ZIP:
			ext = ".zip"

		if resource.Resource == ResourceType.ALL_PROJECTION:
			name = "projections"
		elif resource.Resource == ResourceType.PROJECTION:
			name = "projection"
		elif resource.Resource == ResourceType.RECON_SLICE:
			name = "centre-slice"
		elif resource.Resource == ResourceType.RECONSTRUCTION:
			name = "reconstruction"

		return Path(f"./output/{self._result_path}/file").with_name(name).with_suffix(ext)

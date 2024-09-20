from dataclasses import dataclass
from random import sample
from typing import List, Optional, Tuple

from webct.components.Material import Material


@dataclass(frozen=True)
class RenderedSample:
	"""Represents an immutable sample with fixed material properties.

	Generated from `Sample.render()`.
	"""
	label: str
	modelPath: str
	sizeUnit: str
	materialID: str
	material: Material

@dataclass(frozen=True)
class Sample:
	"""Represents a sample to be scanned by a x-ray detector.
	label (str): A human-friendly name of the sample.
	path (str): A path to the .stl model of the sample.
	materialID (str): The ID of the sample's material.
	unit (str, optional): The unit scale of the .stl model. Defaults to "mm".
	"""

	label: str  # Returns a human-friendly name of the sample
	modelPath: str  # Returns the path to the sample's model.
	sizeUnit: Optional[str]  # Return the unit size of the sample's model. (mm, cm, etc)
	materialID: str # Returns the material ID of this sample.

	def to_json(self) -> dict:
		sample = self.__dict__.copy()
		return sample

	@staticmethod
	def from_json(json: dict):
		if "label" not in json or "modelPath" not in json or "materialID" not in json:
			raise ValueError(f"Missing keys. {json.keys()}")

		str(json["label"])
		str(json["modelPath"])
		str(json["materialID"])

		# label
		label = str(json["label"])
		if label == "":
			raise ValueError(
				"Label cannot be blank. Use a short memorable name, like rod-cladding."
			)

		# modelpath
		modelPath = str(json["modelPath"])
		if modelPath == "":
			raise ValueError("modelPath cannot be blank.")
		elif (
			":" in modelPath
			or ".." in modelPath
			or modelPath[0] == "/"
			or modelPath[0] == "\\"
		):
			# todo: replace with pathlib check to cat potential security issues
			raise ValueError("modelpath cannot escape the current folder.")

		# materialID
		materialID = str(json["materialID"])
		if materialID == "":
			raise ValueError("material ID cannot be blank")

		# size unit
		size_unit = "mm"
		if "sizeUnit" in json and json["sizeUnit"] is not None:
			try:
				str(json["sizeUnit"])
			except (ValueError, TypeError):
				raise TypeError("sizeUnit was provided, but isn't a string.")
			size_unit = str(json["sizeUnit"])
			if len(size_unit) > 2 or len(size_unit) == 0:
				raise ValueError("sizeUnit must be a valid SI prefix (mm, cm, m)")

		return Sample(label, modelPath, size_unit, materialID)

	def get_material(self) -> Optional[Material]:
		"""Render the material ID into material properties.

		Returns:
			Optional[Material]: Material properties, None if the material does not exist.
		"""
		try:
			return Material.from_id(self.materialID)
		except ValueError:
			return None

	def render(self) -> RenderedSample:
		mat = self.get_material()
		if mat is None:
			raise ValueError("Unable to render sample: Material ID '"+self.materialID+"' cannot be found.")
		sizeUnit = "mm" if self.sizeUnit is None else self.sizeUnit
		return RenderedSample(self.label, self.modelPath, sizeUnit, self.materialID, mat)

@dataclass(frozen=True)
class RenderedSampleSettings:
	scaling: float
	samples: Tuple[RenderedSample]

@dataclass(frozen=True)
class SampleSettings:
	scaling: float
	samples: Tuple[Sample]

	def render(self) -> RenderedSampleSettings:
		print(self.__dict__)
		return RenderedSampleSettings(
			scaling = self.scaling,
			samples = [sample.render() for sample in self.samples]
		)

	def to_json(self) -> dict:
		json = self.__dict__.copy()
		json["samples"] = list([sample.to_json() for sample in self.samples])
		return json
	
	def from_json(json: dict):
		if "scaling" not in json or "samples" not in json:
			raise KeyError(f"Missing keys. {json.keys()}")
		
		float(json["scaling"])
		list(json["samples"])

		scaling = float(json["scaling"])
		if scaling == 0:
			raise ValueError("Scaling cannot be 0. Scaling must be positive or negative.")
		
		samples = []
		for sample in json["samples"]:
			samples.append(Sample.from_json(sample))

		return SampleSettings(scaling=scaling, samples=tuple(samples))


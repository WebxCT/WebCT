from dataclasses import dataclass
from enum import Enum
import json
from typing import Dict, Iterator, Tuple
from gvxrPython3 import gvxr

@dataclass(frozen=True)
class SaveableParameters:
	"""A represenetation of paramaters that can be saved to disk and later
	loaded. An example would be a material setting file, a sample setting file,
	etc."""

	label: str
	description: str

	def to_json(self) -> dict:
		return self.__dict__

	@staticmethod
	def from_json(json: dict):
		if "label" not in json:
			raise ValueError("Missing Keys")
		str(json["label"])

		# label
		label = str(json["label"])

		# description
		# if description is not defined, set to ""
		description = ""
		if "description" in json:
			description = str(json["description"])

		return SaveableParameters(label, description)


@dataclass(frozen=True)
class Material(SaveableParameters):
	"""A representation of the chemical elements constructing a compound, or an element."""

	density: float  # g/cm-3

	def to_json(self) -> dict:
		return self.__dict__

	@staticmethod
	def from_json(json: dict):
		parent = SaveableParameters.from_json(json)

		if "density" not in json:
			raise ValueError("Missing keys.")

		float(json["density"])

		# density
		density = float(json["density"])
		if density < 0:
			raise ValueError("Density cannot be smaller than 0g/cm-3")

		return Material(parent.label, parent.description, density)

	@staticmethod
	def from_id(ID: str):
		if "/" not in ID:
			raise ValueError("Category splitter not found.")
		if ID == "":
			raise ValueError("Material ID cannot be empty.")

		# Special materials
		if ID == "special/air":
			return SpecialMaterial("Air", "Air", 0.0, SpecialMaterialEnum.air)

		catID = ID.split("/")[0]

		if catID not in MATERIALS:
			raise ValueError("Cannot find material category.")
		category = MATERIALS[catID]

		matID = ID.split("/")[1]
		if matID not in category:
			raise ValueError("Cannot find material in category.")
		return category[matID]


# I would like to put this global at the top, but due to python shenanigans, I
# cannot use type hinting because the type is not yet declared.....
MATERIALS: Dict[str, Dict[str, Material]] = {}


@dataclass(frozen=True)
class ElementMaterial(Material):
	"""A material made from a single element."""

	# matxerial: List[Literal["Element"], str]
	element: str

	def to_json(self) -> dict:
		parent = super().to_json()
		parent["material"] = ["element", self.element]
		return parent

	@staticmethod
	def from_json(json: dict):
		parent = Material.from_json(json)

		if "material" not in json:
			raise ValueError("Missing keys.")
		list(json["material"])
		str(list(json["material"])[0])
		str(list(json["material"])[1])

		# element
		material = list(json["material"])
		if len(material) != 2 or material[0].lower() != "element":
			raise ValueError("Element material key must only contain 'Element', and an elemental symbol.")
		if len(material[1]) > 2:
			raise ValueError("Element must be the elemental symbol. ('Cu' for Copper).")
		element = material[1]

		return ElementMaterial(parent.label, parent.description, parent.density, element)

	@property
	def atomicNumber(self) -> int:
		"""Get the atomic number of the element.

		Returns:
			int: The atomic number of the element.
		"""
		return gvxr.getElementAtomicNumber(self.element)


@dataclass(frozen=True)
class CompoundMaterial(Material):
	"""A material constructed from a chemical compound."""

	compound: str

	def to_json(self) -> dict:
		parent = super().to_json()
		parent["material"] = ["compound", self.compound]
		return parent

	@staticmethod
	def from_json(json: dict):
		parent = Material.from_json(json)

		if "material" not in json:
			raise ValueError("Missing keys.")
		tuple(json["material"])
		str(tuple(json["material"])[0])
		str(tuple(json["material"])[1])

		# compound
		material = tuple(json["material"])
		if len(material) != 2 or material[0].lower() != "compound":
			raise ValueError("Compound material key must only contain 'Element', and a compound.")
		compound = material[1]

		return CompoundMaterial(parent.label, parent.description, parent.density, compound)


@dataclass(frozen=True)
class MixtureMaterial(Material):
	"""A Material constructed from multiple chemical elements."""

	elements: Tuple[str]
	weights: Tuple[float]

	def to_json(self) -> dict:
		parent = super().to_json().copy()
		parent["material"] = ["mixture", []]

		for i, element in enumerate(self.elements):
			parent["material"][1].append(element)
			parent["material"][1].append(self.weights[i])

		del parent["elements"]
		del parent["weights"]
		return parent


	@staticmethod
	def from_json(json: dict):
		parent = Material.from_json(json)

		if "material" not in json:
			raise ValueError("Missing keys.")
		tuple(json["material"])
		str(tuple(json["material"])[0])
		tuple(tuple(json["material"])[1])

		# mixture
		material = tuple(json["material"])
		if len(material) != 2 or material[0].lower() != "mixture":
			raise ValueError("Mixture material key must only contain 'mixture', and a mixed list of element symbols and quantities.")

		elements = []
		weights = []
		iselement = False

		for i, item in enumerate(material[1]):
			iselement = not iselement
			if iselement:
				element = str(item)
				if len(element) > 2:
					raise ValueError(f"Element {item} at index {i} must be given as an atomic symbol ('Cu' for Copper).")
				elements.append(item)
			else:
				weight = float(item)
				if weight > 1.0:
					raise ValueError(f"Element weight {item} at index {i} must be a float between 0.0 and 1.0")
				weights.append(weight)

		if len(weights) != len(elements):
			raise ValueError(
				f"Must have same number of elements and weights ({len(elements)} elements, {len(weights)} weights)."
			)

		return MixtureMaterial(parent.label, parent.description, parent.density, elements, weights)

	@property
	def atomicNumbers(self) -> Tuple[int, ...]:
		atomics = []
		for element in self.elements:
			atomics.append(gvxr.getElementAtomicNumber(element))
		return tuple(atomics)

	def __iter__(self) -> Iterator[str]:
		return self.elements.__iter__()

@dataclass(frozen=True)
class HUMaterial(Material):

	HUunit: float

	def to_json(self) -> dict:
		parent = super().to_json()
		parent["material"] = ["hu", self.HUunit]
		return parent

	@staticmethod
	def from_json(json: dict):
		parent = Material.from_json(json)

		if "material" not in json:
			raise ValueError("Missing keys.")
		tuple(json["material"])
		str(tuple(json["material"])[0])
		float(tuple(json["material"])[1])

		# compound
		material = tuple(json["material"])
		if len(material) != 2 or material[0].lower() != "hu":
			raise ValueError("HU material key must only contain 'HU', and a number.")
		HUunit = float(material[1])

		return HUMaterial(parent.label, parent.description, parent.density, HUunit)


class SpecialMaterialEnum(Enum):
	air = "air"

	def to_json(self):
		return self.value


@dataclass(frozen=True)
class SpecialMaterial(Material):
	matType: SpecialMaterialEnum

	def to_json(self) -> dict:
		parent = super().to_json()
		parent["material"] = ["special", self.matType.value]
		return parent

	@staticmethod
	def from_json(json: dict):
		parent = Material.from_json(json)

		if "material" not in json:
			raise ValueError("Missing keys.")
		tuple(json["material"])
		str(tuple(json["material"])[0])
		str(tuple(json["material"])[1])

		material = json["material"]

		if len(material) != 2 or material[0].lower() != "special":
			raise ValueError("Special Material key must only contain 'special' and a specific material.")

		try:
			mat = SpecialMaterialEnum[material[1]]
			return SpecialMaterial(parent.label, parent.description, parent.density, matType=mat)
		except KeyError:
			raise ValueError(f"'{material[1]}' is not a special material.")


def MaterialFromJson(json: dict) -> Material:
	"""Select and create a material type from a json dict."""
	if "material" not in json:
		raise TypeError("Given dict does not contain a 'material' key.")
	if len(json["material"]) != 2:
		raise TypeError("Dict material key does not contain the required amount of elements.")

	if "element" in json["material"][0]:
		return ElementMaterial.from_json(json)
	if "compound" in json["material"][0]:
		return CompoundMaterial.from_json(json)
	if "mixture" in json["material"][0]:
		return MixtureMaterial.from_json(json)
	if "hu" in json["material"][0]:
		return HUMaterial.from_json(json)
	if "special" in json["material"][0]:
		return SpecialMaterial.from_json(json)

	raise TypeError(
		f"Unable to deduce material type. Was given a material key with a value of {json['material']} elements."
	)


class MaterialEncoder(json.JSONEncoder):
	def default(self, o):
		if "to_json" in dir(o):
			return o.to_json()
		return json.JSONEncoder.default(self, o)

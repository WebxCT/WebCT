from dataclasses import dataclass
from typing import Dict, Literal, Tuple, Type, Union, cast

from cil.framework import AcquisitionData, ImageGeometry, BlockDataContainer
from cil.optimisation.operators import (Operator, IdentityOperator, BlockOperator, GradientOperator)
from cil.plugins.astra.operators import ProjectionOperator

class IterativeBlockParams():
	...

@dataclass(frozen=True)
class IterativeOperator:
	method:str
	params:IterativeBlockParams

	def get(self, ig:ImageGeometry, acData:AcquisitionData) -> Tuple[BlockOperator, Operator]:
		...

@dataclass(frozen=True)
class ProjectionBlockParams(IterativeBlockParams):
	...

@dataclass(frozen=True)
class ProjectionBlock(IterativeOperator):
	method:str = "projection"
	params:ProjectionBlockParams = ProjectionBlockParams()

	def get(self, ig:ImageGeometry, acData:AcquisitionData) -> Tuple[Operator, None]:
		opProj = ProjectionOperator(ig,acData.geometry)
		# Wrapping a ProjectionOperator in a block operator causes an invalid reconstruction output
		# opblock_proj = BlockOperator(opProj)

		return opProj, None

@dataclass(frozen=True)
class IdentityBlockParams(IterativeBlockParams):
	alpha:float=0.1

@dataclass(frozen=True)
class IdentityBlock(IterativeOperator):
	method:str = "identity"
	params:IdentityBlockParams = IdentityBlockParams()

	def get(self, ig:ImageGeometry, acData:AcquisitionData) -> Tuple[BlockOperator, Operator]:
		opProj = ProjectionOperator(ig,acData.geometry)
		opIdent = IdentityOperator(ig)

		opblock_ident = BlockOperator(opProj, self.params.alpha * opIdent)
		return opblock_ident, opIdent

@dataclass(frozen=True)
class GradientBlockParams(IterativeBlockParams):
	alpha:float = 0.1
	boundary:Union[Literal["Neumann"], Literal["Periodic"]] = "Neumann"

@dataclass(frozen=True)
class GradientBlock(IterativeOperator):
	method:str = "gradient"
	params:GradientBlockParams = GradientBlockParams()

	def get(self, ig:ImageGeometry, acData:AcquisitionData) -> Tuple[BlockOperator, Operator]:
		opProj = ProjectionOperator(ig, acData.geometry)
		opGrad = GradientOperator(ig, bnd_cond=self.params.boundary)

		opblock_grad = BlockOperator(opProj, self.params.alpha * opGrad)
		return opblock_grad, opGrad

IterativeOperators:Dict[str, Dict[str, Union[Type[IterativeOperator], Type[IterativeBlockParams]]]] = {
	"projection": {
		"type": ProjectionBlock,
		"params":ProjectionBlockParams
	},
	"identity": {
		"type": IdentityBlock,
		"params":IdentityBlockParams
	},
	"gradient": {
		"type": GradientBlock,
		"params":GradientBlockParams
	}
}

def dataWithOp(operator:IterativeOperator, ig:ImageGeometry, acData:AcquisitionData) -> Tuple[Union[BlockOperator,ProjectionOperator], Union[AcquisitionData, BlockDataContainer]]:
		# Note: A projection operator will return (Operator, None)
		blockOp, Lop = operator.get(ig, acData)

		# Need to allocate data into a BlockDataContainer when using
		# block operations. The projection block operator is just a
		# wrapped ProjectionOperator, and does not work on
		# BlockDataContainer.
		data = acData
		if operator.method != "projection":
			if Lop.range is not None:
				data = BlockDataContainer(acData, Lop.range.allocate(0))
			else:
				raise ValueError(f"Unexpected None range of block projection operator '{operator.method}'")
		return blockOp, data

def OperatorFromJson(json: dict) -> IterativeOperator:
	if "method" not in json:
		raise KeyError("Operator key lacks a method key.")
	if "params" not in json:
		raise KeyError("Operator key lacks a param key.")

	if json["method"] not in IterativeOperators:
		raise NotImplementedError(f"Iterative operator '{json['method']}' is not supported.")

	opType:Type[IterativeOperator] = cast(Type[IterativeOperator], IterativeOperators[json["method"]]["type"])
	opParams = json["params"]

	if opType == ProjectionBlock:
		return ProjectionBlock()

	elif opType == IdentityBlock:
		alpha = 0.1
		if "alpha" in opParams:
			alpha = float(opParams["alpha"])
		operatorParams = IdentityBlockParams(alpha)
		return IdentityBlock(params=operatorParams)

	elif opType == GradientBlock:
		alpha = 0.1
		if "alpha" in opParams:
			alpha = float(opParams["alpha"])
		boundary = "Neumann"

		if "boundary" in opParams:
			if opParams["boundary"].lower() == "periodic":
				boundary = "Periodic"

		operatorParams = GradientBlockParams(alpha, boundary)
		return GradientBlock(params=operatorParams)

	else:
		raise NotImplementedError(f"Iterative operator {opType} is not implemented.")

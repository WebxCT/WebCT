from dataclasses import dataclass
from typing import List

from webct.components.Beam import BeamParameters, LabBeam, TwinBeam



@dataclass
class DigitalTwin:
	name: str
	description:str
	date:str

	def getFlux(self)

	def applyTwin(self, beam:BeamParameters) -> TwinBeam:

		if isinstance(beam, LabBeam):

		...

TWINS:List[DigitalTwin] = []

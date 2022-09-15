import { SynchBeam, TubeBeam } from "../../../../beam/static/js/types";
import { MaterialLib } from "../../../../samples/static/js/samples";
import { configFull, configSubset } from "../types";
import { FormatLoader, FormatLoaderStatic } from "./FormatLoader";

type DistanceUnit = "m" | "cm"| "mm" | "um"
type EnergyUnit = "electronvolt" | "eV" | "kiloelectronvolt" | "keV" | "megaelectronvolt" | "MeV"
type Position = [number, number, number, DistanceUnit]
type FilePath = string
type MatElement = string
type MatCompound = string
type MatHU = number
type MatMU = number

interface detectorConfig {
	Position: Position
	UpVector: [number, number, number]
	NumberOfPixels: [number, number],
	Spacing: [number, number, string]
}

type ParallelBeam = "ParallelBeam" | "Parallel"
type PointBeam = "PointSource"
type BeamShape = ParallelBeam | PointBeam

interface BeamEnergy {
	Energy:number,
	Unit:EnergyUnit,
	Count:number,
}

interface GateMacro {
	Unit:EnergyUnit
	GateMacro:FilePath
}

interface TextFile {
	Unit:EnergyUnit
	TextFile:FilePath
}

interface Tube {
	kvp: number,
	"tube angle": number
	filter?: [MatElement, number][]
}

type BeamSource = BeamEnergy[] | GateMacro | TextFile | Tube

interface sourceConfig {
	Position: Position,
	Shape: BeamShape,
	Beam: BeamSource

}

type MatMixture = string | [string, number][]

type Material = ["element", MatElement] | ["compound", MatCompound] | ["mixture", MatMixture] | ["hu", MatHU] | ["mu", MatMU]

interface sampleConfig {
	Label:string,
	Cube?:[number, DistanceUnit]
	Cylinder?:[number, number,number, DistanceUnit],
	Path?: FilePath,
	Material: Material,
	Density?:number,
	Transform?: ["Rotation",number,number, number, number] | ["Translation", number, number, number, DistanceUnit] | ["Scaling", number, number, number]
	Type?: "inner" | "outer"
	opacity?:number
}

export const GVXRConfig:FormatLoaderStatic = class GVXRConfig implements FormatLoader {
	Detector: detectorConfig;
	Source:sourceConfig;
	Samples:sampleConfig[];

	constructor(detector:detectorConfig, source:sourceConfig, samples:sampleConfig[]){
		this.Detector = detector;
		this.Source=  source;
		this.Samples = samples;
	}

	static from_config(data:configFull){

		const detector:detectorConfig = {
			UpVector: [0, 1, 0],
			Position: [...data.capture.beamPosition, "mm" as DistanceUnit],
			Spacing: [data.detector.pixelSize, data.detector?.pixelSize, "mm" as DistanceUnit],
			NumberOfPixels: [data.detector.paneWidth / (data.detector.pixelSize), data.detector.paneHeight / (data.detector.pixelSize)]
		};
		let beam:BeamSource;
		if (data.beam.method == "synch") {
			const synchBeam:SynchBeam = data.beam as never;
			const totalCount = synchBeam.exposure * synchBeam.intensity;
			beam = [{
				Unit:"keV" as EnergyUnit,
				Energy: synchBeam.energy,
				Count: !synchBeam.harmonics ? totalCount : totalCount * 0.96,
			}];

			if (synchBeam.harmonics) {
				beam.push({
					Unit: "keV" as EnergyUnit,
					Energy: synchBeam.energy * 2,
					Count: totalCount * 0.03,
				});
				beam.push({
					Unit: "keV" as EnergyUnit,
					Energy: synchBeam.energy * 3,
					Count: totalCount * 0.01,
				});
			}
		} else {
			// Tube devices
			const tubeBeam:TubeBeam = data.beam as never;
			beam ={
				kvp: tubeBeam.voltage,
				"tube angle": tubeBeam.anodeAngle,
			};
		}

		const source:sourceConfig = {
			Position: [...data.capture.beamPosition, "mm" as DistanceUnit],
			Shape: data.beam.method == "synch" ? "Parallel" : "PointSource",
			Beam: beam
		};

		const samples:sampleConfig[] = [];
		for (let index = 0; index < data.samples.length; index++) {
			const sample = data.samples[index];

			let material:Material;
			if (sample.material == undefined) {
				const matsplit = sample.materialID?.split("/");
				if (matsplit !== undefined) {
					const mat = structuredClone(MaterialLib[matsplit[0]][matsplit[1]]).material;
					if (mat[0] == "special") {
						continue;
					} else {
						material = mat;
					}
				}
				continue;
			} else {
				if (sample.material.material[0] == "special") {
					// ignore webct 'special' materials
					continue;
				}
				material = sample.material.material;
			}

			samples.push({
				Label: sample.label,
				Material: material,
				Path: sample.modelPath,
				Density: sample.material.density,
			});
		}

		return new GVXRConfig(detector, source, samples);
	}

	static from_text(data:string): GVXRConfig {
		return new GVXRConfig({} as detectorConfig,{} as sourceConfig,{} as sampleConfig[]);
	}

	as_config():configSubset {
		return {
		};
	}

	static can_parse(obj:unknown): boolean {
		// Ensure we have an object
		if (typeof obj !== "object") {
			return false;
		}

		// ! https://github.com/microsoft/TypeScript/pull/50666
		// Please fix this issue microsoft, why can we not coherece typing on
		// the unknown type????
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		const o:any = obj;
		// if (!("Detector" in obj)) {
		// 	return false;
		// }

		// Workaround until aformentioned 'unknown' issues are fixed...
		if(!Object.prototype.hasOwnProperty.call(obj, "Detector")){return false;}
		if(!Object.prototype.hasOwnProperty.call(obj, "Source")){return false;}
		if(!Object.prototype.hasOwnProperty.call(obj, "Samples")){return false;}
		if(!Object.prototype.hasOwnProperty.call(o.Source, "Shape")){return false;}
		if(!Object.prototype.hasOwnProperty.call(o.Detector, "Position")){return false;}

		// We've assured a bunch of gvxr-only keys exist, therefore it looks
		// like a gvxr config we can parse later on. We don't do the full
		// parsing here as can_parse is supposed to be a quick check.
		return true;
	}
};

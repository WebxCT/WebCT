import { ElementSymbols } from "../../../../base/static/js/elements";
import { BeamProperties, Filter, LabBeam, SynchBeam, TubeBeam } from "../../../../beam/static/js/types";
import { ScintillatorMaterial } from "../../../../detector/static/js/types";
import { MaterialLib } from "../../../../samples/static/js/samples";
import { Material, SampleProperties } from "../../../../samples/static/js/types";
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
	Spacing: [number, number, string],
	LSF: number[],
	Scintillator: {
		Material: string,
		Thickness: number,
		Unit: string
	},
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

type GVXRMaterial = ["element", MatElement] | ["compound", MatCompound] | ["mixture", MatMixture] | ["hu", MatHU] | ["mu", MatMU]

interface sampleConfig {
	Label:string,
	Cube?:[number, DistanceUnit]
	Cylinder?:[number, number,number, DistanceUnit],
	Path?: FilePath,
	Material: GVXRMaterial,
	Density?:number,
	Transform?: ["Rotation",number,number, number, number] | ["Translation", number, number, number, DistanceUnit] | ["Scaling", number, number, number]
	Type?: "inner" | "outer"
	opacity?:number,
	Unit:DistanceUnit,
}

export const GVXRConfig:FormatLoaderStatic = class GVXRConfig implements FormatLoader {
	Detector: detectorConfig;
	Source:sourceConfig;
	Samples:sampleConfig[];

	constructor(detector:detectorConfig, source:sourceConfig, samples:sampleConfig[]){
		this.Detector = detector;
		this.Source = source;
		this.Samples = samples;
	}

	static from_config(data:configFull){
		console.log("fromconfig");

		const detector:detectorConfig = {
			UpVector: [0, 1, 0],
			Position: [...data.capture.beamPosition, "mm" as DistanceUnit],
			Spacing: [data.detector.pixelSize, data.detector?.pixelSize, "mm" as DistanceUnit],
			NumberOfPixels: [data.detector.paneWidth / (data.detector.pixelSize), data.detector.paneHeight / (data.detector.pixelSize)],
			LSF: data.detector.lsf.values,
			Scintillator: {
				Material: data.detector.scintillator.material,
				Thickness: data.detector.scintillator.thickness,
				Unit: "mm"
			}
		};

		let beam:BeamSource;
		if (data.beam.method == "synch") {
			console.log("beamsynch");
			const synchBeam:SynchBeam = data.beam as never;
			const totalCount = synchBeam.exposure * synchBeam.flux * 10e10;
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

			let material:GVXRMaterial;
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
				Unit: "mm"
			});
		}


		return new GVXRConfig(detector, source, samples);
	}

	static from_text(data:string): GVXRConfig {
		// Parse json, allow error to be thrown upwards
		const obj = JSON.parse(data);

		// Yes, we're assuming the json file has all objects existing and no mismatched errors.
		// Yes, this should be replaced with a proper procedure to typecheck and validate all properties
		const detector:detectorConfig = obj["Detector"];
		const source:sourceConfig = obj["Source"];
		const samples:sampleConfig[] = obj["Samples"];

		if (detector.LSF === undefined) {
			console.log("Undefined lsf");
			detector.LSF = [0,1,0];
		}

		if (detector.Scintillator === undefined) {
			console.log("Undefined Scintillator")
			detector.Scintillator = {
				Material: "",
				Thickness: 0,
				Unit: "mm"
			}
		}

		return new GVXRConfig(detector, source, samples);
	}

	as_config():configSubset {
		let beam:BeamProperties;

		if (this.Source.Shape == "Parallel" || this.Source.Shape == "ParallelBeam") {
			// setup synch properties
			const configBeam = this.Source.Beam as BeamEnergy[];
			beam = new SynchBeam(
				configBeam[0].Energy,
				1,1,false,[]
			);
		} else {
			// We only support kvp imports
			const configBeam = this.Source.Beam as Tube;
			let filters:Filter[] = [];
			if (configBeam.filter !== undefined && configBeam.filter.length > 0) {
				filters = [{
					material:ElementSymbols[configBeam.filter[0][0] as string as keyof typeof ElementSymbols],
					thickness:configBeam.filter[0][1]
				}];
			}
			beam = new LabBeam(
				configBeam.kvp,
				1,
				1,
				1,
				ElementSymbols.W,
				"spekpy",
				configBeam["tube angle"],
				filters,
			);
		}

		const samples:SampleProperties[] = [];
		for (let index = 0; index < this.Samples.length; index++) {
			const sample = this.Samples[index];

			if (!("Path" in sample) || sample.Path == undefined) {
				throw "Only path samples are supported";
			}

			if (sample.Material[0] == "mu") {
				throw "MU Materials not supported";
			}

			const material: Material = {
				density: sample.Density as number,
				description: "Imported GVXR Material",
				material: sample.Material as Material["material"],
				label: "GVXR Material "+index
			};

			samples.push({
				label:sample.Label,
				modelPath:sample.Path,
				sizeUnit:sample.Unit,
				material:material
			});
		}

		// Convert units into mm
		let pixelSize = this.Detector.Spacing[0];
		let paneHeight = this.Detector.NumberOfPixels[0] * pixelSize;
		let paneWidth = this.Detector.NumberOfPixels[1] * pixelSize;

		if (this.Detector.Spacing[2] !== "mm") {
			switch (this.Detector.Spacing[2]) {
			case "cm":
				paneHeight = paneHeight * 10;
				paneWidth = paneHeight * 10;
				pixelSize = paneHeight * 10;
				break;
			case "um":
				paneHeight = paneHeight * 0.001;
				paneWidth = paneHeight * 0.001;
				pixelSize = paneHeight * 0.001;
				break;
			default:
				// Eh
				break;
			}
		}

		// Scintillator
		let scintillatorMaterial = this.Detector.Scintillator.Material as ScintillatorMaterial;

		let scintillatorThickness = this.Detector.Scintillator.Thickness;
		if (this.Detector.Scintillator.Unit !== "mm") {
			switch (this.Detector.Scintillator.Unit) {
			case "cm":
				scintillatorThickness = scintillatorThickness * 10;
				break;
			case "um":
				scintillatorThickness = scintillatorThickness * 0.001;
				break;
			default:
				break;
			}
		}

		return {
			detector: {
				paneHeight: paneHeight,
				paneWidth: paneWidth,
				pixelSize: pixelSize,
				lsf: {pixels:Array.from(this.Detector.LSF, (e,i)=>i-Math.floor(this.Detector.LSF.length/2)), values:this.Detector.LSF},
				scintillator: {
					material: scintillatorMaterial,
					thickness: scintillatorThickness
				}
			},
			beam: beam,
			samples: samples
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

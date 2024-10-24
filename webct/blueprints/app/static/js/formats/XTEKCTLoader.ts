import { ElementSymbols } from "../../../../base/static/js/elements";
import { BeamProperties, Filter, LabBeam, SynchBeam, TubeBeam } from "../../../../beam/static/js/types";
import { DetectorProperties, ScintillatorMaterial } from "../../../../detector/static/js/types";
import { MaterialLib } from "../../../../samples/static/js/samples";
import { Material, SampleProperties } from "../../../../samples/static/js/types";
import { configFull, configSubset } from "../types";
import { FormatLoader, FormatLoaderStatic } from "./FormatLoader";

interface xtekctConfig {
	// Filename of Tiff files
	Name?: string,

	// Number of projections
	Projections: number

	// White level - used for normalization
	WhiteLevel?: number

	// Number of pixels on Y Axis
	DetectorPixelsY: number
	// Number of pixels on X Axis
	DetectorPixelsX: number
	// Pixel  Pitch along X axis
	DetectorPixelSizeX: number
	// Pixel Pitch along Y axis
	DetectorPixelSizeY?: number

	// Source to center of rotation
	SrcToObject: number
	// Source to detector Distance
	SrcToDetector: number

	// Initial angular position of the rotation stage
	InitialAngle: number
	// Angular increment (in degrees)
	AngularStep: number

	// Detector offset in X 'units'
	DetectorOffsetX?: number
	// Detector offset in Y 'units'
	DetectorOffsetY?: number

	XraykV: number
	XrayuA: number

	Filter_ThicknessMM?: number,
	Filter_Material?: string,

	// New format:
	// Object offset in X units
	// Object roll in degrees (around z)
	// Object tilt in degrees (around x)

	// Old format:
	// Centre of Rotation Top (?)
	// Center of Rotation Bottom (?)

}

export const XTEKCTConfig: FormatLoaderStatic = class XTEKCTConfig implements FormatLoader {
	config: xtekctConfig;

	constructor(config: xtekctConfig) {
		this.config = config;
	}

	as_config(): configSubset {
		let beam: BeamProperties

		const filter = {
			thickness: this.config.Filter_ThicknessMM ?? 0,
			material: ElementSymbols[this.config.Filter_Material as keyof typeof ElementSymbols ?? "Cu"] ?? ElementSymbols.Cu,
		}
		beam = new LabBeam(this.config.XraykV, true, 1, this.config.XrayuA, 0, ElementSymbols.W, "spekpy", 12, [filter])

		let pixelSize = this.config.DetectorPixelSizeX

		return {
			beam: beam,
			detector: {
				binning: 1,
				enableLSF: false,
				lsf: { pixels: [-1, 0, 1], values: [0, 1, 0] },
				pixelSize: pixelSize,
				paneHeight: this.config.DetectorPixelsX * pixelSize,
				paneWidth: this.config.DetectorPixelsY * pixelSize,
				scintillator: { material: "", thickness: 100 },
			},
			capture: {
				beamPosition: [0, this.config.SrcToObject * -1, 0],
				detectorPosition: [0, this.config.SrcToDetector - this.config.SrcToObject, 0],
				numProjections: this.config.Projections ?? 360,
				sampleRotation: [0, 0, 0],
				totalAngle: this.config.AngularStep * this.config.Projections,
			}
		};
	};

	static from_config(data:configFull) {

		if (data.beam.method == "synch") {
			throw "Nikon XTEKCT does not support synchrotron sources."
		}

		return new XTEKCTConfig({
			AngularStep: data.capture.totalAngle / data.capture.numProjections,
			DetectorPixelSizeX: data.detector.pixelSize,
			DetectorPixelSizeY: data.detector.pixelSize,
			DetectorPixelsX: data.detector.paneHeight / data.detector.pixelSize,
			DetectorPixelsY: data.detector.paneWidth / data.detector.pixelSize,
			InitialAngle: 0,
			Projections: data.capture.numProjections,
			SrcToDetector: (data.capture.beamPosition[1] *-1) + data.capture.detectorPosition[1],
			SrcToObject: data.capture.beamPosition[1],
			XraykV: (data.beam as LabBeam).voltage,
			XrayuA: (data.beam as LabBeam).intensity,
			Filter_Material: data.beam.filters[0].material + "",
			Filter_ThicknessMM: data.beam.filters[0].thickness
		})
	}

	static from_text(data: string): XTEKCTConfig {
		let config: any = {};
		let lines = data.split("\n")
		console.log("Config Reading: ");

		for (let index in lines) {
			let line = lines[index]
			if (line.startsWith("[")) {
				// skip [] property lines
				continue;
			}

			// split into property and value
			let prop = line.split("=")[0]
			let value = line.split("=")[1]
			console.log(prop +": " + value);
			
			// File metadata
			if (prop == "Name") { config["Name"] = value }

			// Beam
			else if (prop == "XraykV") { config["XraykV"] = parseFloat(value) }
			else if (prop == "XrayuA") { config["XrayuA"] = parseFloat(value) }
			else if (prop == "Filter_ThicknessMM") { config["Filter_ThicknessMM"] = parseFloat(value) }
			else if (prop == "Filter_Material") { config["Filter_Material"] = value }

			// Detector
			else if (prop == "DetectorPixelsY") { config["DetectorPixelsY"] = parseInt(value) }
			else if (prop == "DetectorPixelsX") { config["DetectorPixelsX"] = parseInt(value) }
			else if (prop == "DetectorPixelSizeX") { config["DetectorPixelSizeX"] = parseFloat(value) }
			else if (prop == "DetectorPixelSizeY") { config["DetectorPixelSizeY"] = parseFloat(value) }

			// Capture
			else if (prop == "Projections") { config["Projections"] = parseInt(value) }
			else if (prop == "SrcToObject") { config["SrcToObject"] = parseFloat(value) }
			else if (prop == "SrcToDetector") { config["SrcToDetector"] = parseFloat(value) }
			else if (prop == "InitialAngle") { config["InitialAngle"] = parseFloat(value) }
			else if (prop == "AngularStep") { config["AngularStep"] = parseFloat(value) }
			else if (prop == "DetectorOffsetX") { config["DetectorOffsetX"] = parseFloat(value) }
			else if (prop == "DetectorOffsetY") { config["DetectorOffsetY"] = parseFloat(value) }
			else if (prop == "WhiteLevel") { config["WhiteLevel"] = parseInt(value) }



		}

		return new XTEKCTConfig(config as xtekctConfig)
	}

	static can_parse(obj: unknown): boolean {
		if (typeof obj !== "string") {
			return false;
		}
		return obj.substring(0, 8) === "[XTekCT]";
	}
};

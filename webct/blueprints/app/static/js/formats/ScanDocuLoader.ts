import { AlertType, showAlert } from "../../../../base/static/js/base";
import { ElementSymbols } from "../../../../base/static/js/elements";
import { BeamProperties, Filter, LabBeam, SynchBeam, TubeBeam } from "../../../../beam/static/js/types";
import { configFull, configSubset, ExportOptions } from "../types";
import { FormatLoader, FormatLoaderStatic } from "./FormatLoader";

interface geometrie {
	SourceDetectorDist:number
	SourceObjectDist:number
	ObjectDetectorDist:number
	Magnification:number
}

interface recon {
	ReconstructionMode:string
	ProjectionCount:number
	ProjectionCountPer360deg:number
	ProjectionDimX:number
	ProjectionDimY:number
	ProjectionPixelSizeX:number
	ProjectionPixelSizeY:number
}

interface scanparameter {
	Voltage:number
	Current:number
	Power:number
	Pixelbinning:number
	DetectorPixelX:number
	DetectorPixelY:number
	IntegrationTime:number
	Framebinning:number
}

export const ScanDocuConfig: FormatLoaderStatic = class ScanDocuConfig implements FormatLoader {
	geometry: geometrie;
	recon: recon;
	scanparameter: scanparameter;

	constructor(geo: geometrie, recon:recon, scan:scanparameter) {
		this.geometry = geo;
		this.recon = recon;
		this.scanparameter = scan;
	}
	to_text():string {
		return "Not Implemented"
	};

	as_config(): configSubset {
		let beam: BeamProperties

		// no filter
		const filter = {
			thickness: 0,
			material: ElementSymbols.Cu,
		}

		beam = new LabBeam(this.scanparameter.Voltage, true, (this.scanparameter.IntegrationTime / 1000) * this.scanparameter.Framebinning, this.scanparameter.Current, 0, ElementSymbols.W, "spekpy", 12, [filter])

		let pixelSize = this.recon.ProjectionPixelSizeX

		// force downsize with binning if texture is huge
		let binning = 1;
		if (this.scanparameter.DetectorPixelY > 2000) {
			binning = Math.floor(this.scanparameter.DetectorPixelY / 1000) + 1
			showAlert("Binning Enabled for large Detector", AlertType.WARNING, 5)
		}

		return {
			beam: beam,
			detector: {
				binning: binning,
				enableLSF: false,
				lsf: { pixels: [-1, 0, 1], values: [0, 1, 0] },
				pixelSize: pixelSize,
				paneHeight: this.scanparameter.DetectorPixelY * pixelSize,
				paneWidth: this.scanparameter.DetectorPixelX * pixelSize,
				scintillator: { material: "", thickness: 100 },
			},
			capture: {
				beamPosition: [0, this.geometry.SourceObjectDist * -1, 0],
				detectorPosition: [0, this.geometry.ObjectDetectorDist, 0],
				numProjections: this.recon.ProjectionCountPer360deg ?? 360,
				sampleRotation: [0, 0, 0],
				totalAngle: 360,
				laminographyMode: false,
				detectorRotation: [0, 0, 0],
			}
		};
	};

	static from_config(data:configFull, options:ExportOptions) {

		if (data.beam.method == "synch") {
			throw "ScanDocu Format does not support synchrotron sources."
		}

		return new ScanDocuConfig({
			ObjectDetectorDist: data.capture.detectorPosition[1],
			SourceObjectDist: data.capture.beamPosition[1] * -1,
			SourceDetectorDist: (data.capture.beamPosition[1] * -1) + data.capture.detectorPosition[1],
			Magnification: (data.capture.beamPosition[1] * -1) + data.capture.detectorPosition[1] / data.capture.beamPosition[1] * -1
		},{
			ProjectionCount: data.capture.numProjections,
			ProjectionCountPer360deg: (data.capture.numProjections / data.capture.totalAngle) * data.capture.numProjections,
			ProjectionDimX: data.detector.paneHeight / data.detector.pixelSize,
			ProjectionDimY: data.detector.paneWidth / data.detector.pixelSize,
			ProjectionPixelSizeX: data.detector.pixelSize,
			ProjectionPixelSizeY: data.detector.pixelSize,
			ReconstructionMode: "NormalCt-VerticalFov",
		},{
			Current: (data.beam as LabBeam).intensity,
			Voltage: (data.beam as LabBeam).voltage,
			DetectorPixelX: data.detector.paneHeight / data.detector.pixelSize,
			DetectorPixelY: data.detector.paneWidth / data.detector.pixelSize,
			Framebinning: 1,
			IntegrationTime: (data.beam as LabBeam).exposure / 1000,
			Pixelbinning: data.detector.binning,
			Power: ((data.beam as LabBeam).intensity * 0.000001) * ((data.beam as LabBeam).voltage / 1000)
		})
	}

	static from_text(data: string): ScanDocuConfig {
		let scan: any = {};
		let recon: any = {};
		let geo: any = {};
		let lines = data.split("\n")
		console.log("Config Reading: ");

		for (let index in lines) {
			let line = lines[index].trimStart().trimEnd()

			if (line.startsWith("[")) {
				// skip [] property lines
				continue;
			}

			// split into property and value
			let prop = line.split(">")[0].substring(1)
			let value = line.split(">")[1].split("<")[0]
			console.log(prop +": " + value);

			// Geometrie
			if (prop == "SourceDetectorDist") { geo["SourceDetectorDist"] = parseFloat(value)}
			else if (prop == "SourceObjectDist") { geo["SourceObjectDist"] = parseFloat(value)}
			else if (prop == "ObjectDetectorDist") { geo["ObjectDetectorDist"] = parseFloat(value)}

			// Recon
			else if (prop == "ProjectionCount") { recon["ProjectionCount"] = parseInt(value)}
			else if (prop == "ProjectionCountPer360deg") { recon["ProjectionCountPer360deg"] = parseInt(value)}
			else if (prop == "ProjectionDimX") { recon["ProjectionDimX"] = parseInt(value)}
			else if (prop == "ProjectionDimY") { recon["ProjectionDimY"] = parseInt(value)}
			else if (prop == "ProjectionPixelSizeX") { recon["ProjectionPixelSizeX"] = parseFloat(value)}
			else if (prop == "ProjectionPixelSizeY") { recon["ProjectionPixelSizeY"] = parseFloat(value)}
			else if (prop == "ReconstructionMode") { recon["ReconstructionMode"] = value}

			// Scan Parameter
			else if (prop == "Current") { scan["Current"] = parseFloat(value)}
			else if (prop == "Voltage") { scan["Voltage"] = parseFloat(value)}
			else if (prop == "DetectorPixelX") { scan["DetectorPixelX"] = parseInt(value)}
			else if (prop == "DetectorPixelY") { scan["DetectorPixelY"] = parseInt(value)}
			else if (prop == "Framebinning") { scan["Framebinning"] = parseInt(value)}
			else if (prop == "IntegrationTime") { scan["IntegrationTime"] = parseFloat(value)}
			else if (prop == "Pixelbinning") { scan["Pixelbinning"] = parseInt(value)}
			else if (prop == "Power") { scan["Power"] = parseFloat(value)}

		}

		return new ScanDocuConfig(geo as geometrie, recon as recon, scan as scanparameter)
	}

	static can_parse(obj: unknown): boolean {
		if (typeof obj !== "string") {
			return false;
		}
		return obj.split("\n")[1].substring(0, 13) === "<ScanDocuPara";
	}
};

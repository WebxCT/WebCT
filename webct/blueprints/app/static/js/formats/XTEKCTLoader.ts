import { ElementSymbols } from "../../../../base/static/js/elements";
import { BeamProperties, Filter, LabBeam, SynchBeam, TubeBeam } from "../../../../beam/static/js/types";
import { DetectorProperties, ScintillatorMaterial } from "../../../../detector/static/js/types";
import { MaterialLib } from "../../../../samples/static/js/samples";
import { Material, SampleProperties } from "../../../../samples/static/js/types";
import { configFull, configSubset, ExportOptions } from "../types";
import { FormatLoader, FormatLoaderStatic } from "./FormatLoader";

interface xtekctConfig {
	// Filename of Tiff files
	Name?: string,

	// Number of projections
	Projections: number

	// White level - used for normalization
	WhiteLevel: number

	// Number of pixels on Y Axis
	DetectorPixelsY: number
	// Number of pixels on X Axis
	DetectorPixelsX: number
	// Pixel  Pitch along X axis
	DetectorPixelSizeX: number
	// Pixel Pitch along Y axis
	DetectorPixelSizeY: number

	// Source to center of rotation
	SrcToObject: number
	// Source to detector Distance
	SrcToDetector: number

	// Initial angular position of the rotation stage
	InitialAngle: number
	// Angular increment (in degrees)
	AngularStep: number

	// Detector offset in X 'units'
	DetectorOffsetX: number
	// Detector offset in Y 'units'
	DetectorOffsetY: number

	XraykV: number
	XrayuA: number

	Filter_ThicknessMM: number,
	Filter_Material: string,

	// New format:
	// Object offset in X units
	// Object roll in degrees (around z)
	// Object tilt in degrees (around x)

	// Old format:
	// Centre of Rotation Top (?)
	// Center of Rotation Bottom (?)

	// Unused, but required for export
	OperatorID: string,
	InputSeparator: string,
	InputFolderName: string,
	OutputSeparator: string,
	OutputFolderName: string,
	VoxelsX: number,
	VoxelSizeX: number,
	OffsetX: number,
	VoxelsY: number,
	VoxelSizeY: number,
	OffsetY: number,
	VoxelsZ: number,
	VoxelSizeZ: number,
	OffsetZ: number,
	MaskRadius: number,
	RegionStartX: number,
	RegionPixelsX: number,
	RegionStartY: number,
	RegionPixelsY: number,
	Units: string,
	Scaling: number,
	OutputUnits: string,
	OutputType: number,
	ImportConversion: number,
	AutoScalingType: number,
	ScalingMinimum: number,
	ScalingMaximum: number,
	LowPercentile: number,
	HighPercentile: number,
	CentreOfRotationTop: number,
	CentreOfRotationBottom: number,
	InterpolationType: number,
	BeamHardeningLUTFile: string,
	CoefX4: number,
	CoefX3: number,
	CoefX2: number,
	CoefX1: number,
	CoefX0: number,
	Scale: number,
	FilterType: number,
	CutOffFrequency: number,
	Exponent: number,
	Normalisation: number,
	Scattering: number,
	MedianFilterKernelSize: number,
	ConvolutionKernelSize: number,
	Shuttling: boolean,
	DICOMTags: string,

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
				totalAngle: this.config.AngularStep * this.config.Projections < 270 ? 180 : 360,
				laminographyMode: false,
				detectorRotation: [0, 0, 0],
			}
		};
	};

	to_text(): string {

		// This is actually stupid as hell. Why is multiline formatting with javascript so Ass?
		// Now the entire file's heirachy is screwed because of this nonsense.
		return `[xTekCT]
Name=${this.config.Name}
OperatorID=${this.config.OperatorID}
InputSeparator=${this.config.InputSeparator}
InputFolderName=${this.config.InputFolderName}
OutputSeparator=${this.config.OutputSeparator}
OutputFolderName=${this.config.OutputFolderName}
VoxelsX=${this.config.VoxelsX}
VoxelSizeX=${this.config.VoxelSizeX}
OffsetX=${this.config.OffsetX}
VoxelsY=${this.config.VoxelsY}
VoxelSizeY=${this.config.VoxelSizeY}
OffsetY=${this.config.OffsetY}
VoxelsZ=${this.config.VoxelsZ}
VoxelSizeZ=${this.config.VoxelSizeZ}
OffsetZ=${this.config.OffsetZ}
SrcToObject=${this.config.SrcToObject}
SrcToDetector=${this.config.SrcToDetector}
MaskRadius=${this.config.MaskRadius}
DetectorPixelsX=${this.config.DetectorPixelsX}
DetectorPixelSizeX=${this.config.DetectorPixelSizeX}
DetectorOffsetX=${this.config.DetectorOffsetX}
DetectorPixelsY=${this.config.DetectorPixelsY}
DetectorPixelSizeY=${this.config.DetectorPixelSizeY}
DetectorOffsetY=${this.config.DetectorOffsetY}
RegionStartX=${this.config.RegionStartX}
RegionPixelsX=${this.config.RegionPixelsX}
RegionStartY=${this.config.RegionStartY}
RegionPixelsY=${this.config.RegionPixelsY}
Units=${this.config.Units}
Scaling=${this.config.Scale}
OutputUnits=${this.config.OutputUnits}
OutputType=${this.config.OutputType}
ImportConversion=${this.config.ImportConversion}
AutoScalingType=${this.config.AutoScalingType}
ScalingMinimum=${this.config.ScalingMinimum}
ScalingMaximum=${this.config.ScalingMaximum}
LowPercentile=${this.config.LowPercentile}
HighPercentile=${this.config.HighPercentile}
Projections=${this.config.Projections}
InitialAngle=${this.config.InitialAngle}
AngularStep=${this.config.AngularStep}
CentreOfRotationTop=${this.config.CentreOfRotationTop}
CentreOfRotationBottom=${this.config.CentreOfRotationBottom}
WhiteLevel=${this.config.WhiteLevel}
InterpolationType=${this.config.InterpolationType}
BeamHardeningLUTFile=${this.config.BeamHardeningLUTFile}
CoefX4=${this.config.CoefX4}
CoefX3=${this.config.CoefX3}
CoefX2=${this.config.CoefX2}
CoefX1=${this.config.CoefX1}
CoefX0=${this.config.CoefX0}
Scale=${this.config.Scale}
FilterType=${this.config.FilterType}
CutOffFrequency=${this.config.CutOffFrequency}
Exponent=${this.config.Exponent}
Normalisation=${this.config.Normalisation}
Scattering=${this.config.Scattering}
MedianFilterKernelSize=${this.config.MedianFilterKernelSize}
ConvolutionKernelSize=${this.config.ConvolutionKernelSize}
[Xrays]
XraykV=${this.config.XraykV}
XrayuA=${this.config.XrayuA}
[CTPro]
Filter_ThicknessMM=${this.config.Filter_ThicknessMM}
Filter_Material=${this.config.Filter_Material}
Shuttling=${this.config.Shuttling}
[DICOM]
DICOMTags=${this.config.DICOMTags}
		`
	}

	static from_config(data:configFull, options:ExportOptions) {

		if (data.beam.method == "synch") {
			throw "Nikon XTEKCT does not support synchrotron sources."
		}

		let sdd = (data.capture.beamPosition[1] *-1) + data.capture.detectorPosition[1]
		let sod = data.capture.beamPosition[1] * -1
		let VoxelSize = sod  / sdd * data.detector.pixelSize

		return new XTEKCTConfig({
			Name: "WebCT_Exported",
			// Settings that actually matter
			AngularStep: data.capture.totalAngle / data.capture.numProjections,
			DetectorPixelSizeX: data.detector.pixelSize,
			DetectorPixelSizeY: data.detector.pixelSize,
			DetectorPixelsX: data.detector.paneHeight / data.detector.pixelSize,
			DetectorPixelsY: data.detector.paneWidth / data.detector.pixelSize,
			InitialAngle: 0,
			Projections: data.capture.numProjections,
			SrcToDetector: sdd,
			SrcToObject: sod,
			XraykV: (data.beam as LabBeam).voltage,
			XrayuA: (data.beam as LabBeam).intensity,
			Filter_Material: data.beam.filters[0].material + "",
			Filter_ThicknessMM: data.beam.filters[0].thickness,
			WhiteLevel: 60000,

			// Misc settings required for text export
			OperatorID: "",
			InputSeparator: "_",
			InputFolderName: "",
			OutputSeparator: "_",
			OutputFolderName: "WebCT_Exported",
			VoxelsX: data.detector.paneWidth / data.detector.pixelSize,
			VoxelSizeX: VoxelSize,
			OffsetX: 0,
			VoxelsY: data.detector.paneWidth / data.detector.pixelSize,
			VoxelSizeY: VoxelSize,
			OffsetY: 0,
			VoxelsZ: data.detector.paneHeight / data.detector.pixelSize,
			VoxelSizeZ: VoxelSize,
			OffsetZ: 0,
			MaskRadius: 0,
			DetectorOffsetX: 0,
			DetectorOffsetY: 0,
			RegionStartX: 0,
			RegionPixelsX: data.detector.paneWidth / data.detector.pixelSize,
			RegionStartY: 0,
			RegionPixelsY: data.detector.paneHeight / data.detector.pixelSize,
			Units: "mm",
			Scaling: 1000.0,
			OutputUnits: "/m",
			OutputType: 0,
			ImportConversion: 0,
			AutoScalingType: 0,
			ScalingMinimum: 0,
			ScalingMaximum: 1000,
			LowPercentile: 0.2,
			HighPercentile: 99.8,
			CentreOfRotationTop: 0,
			CentreOfRotationBottom: 0,
			InterpolationType: 1,
			BeamHardeningLUTFile: "",
			CoefX4:0,
			CoefX3:0,
			CoefX2:0,
			CoefX1:0,
			CoefX0:0,
			Scale: 1,
			FilterType: 0,
			CutOffFrequency: 3.937008,
			Exponent: 1.0,
			Normalisation: 1.0,
			Scattering: 0.0,
			MedianFilterKernelSize: 1,
			ConvolutionKernelSize: 0,
			Shuttling: false,
			DICOMTags: `<?xml version="1.0" encoding="utf-16"?><ArrayOfMetaDataSchema xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"><MetaDataSchema xsi:type="MetaDataStringSchema"><Tag>Dataset name</Tag><Description>Dataset name</Description><Identifier>true</Identifier><DataValue>NXCT0462_AG-SDCARD-8gb-Al-1</DataValue><DicomTagGroup>0</DicomTagGroup><DicomTagElement>0</DicomTagElement></MetaDataSchema></ArrayOfMetaDataSchema>`
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

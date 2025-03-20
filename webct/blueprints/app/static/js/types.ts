import { getBeamParms, setBeamParams } from "../../../beam/static/js/beam";
import { BeamProperties } from "../../../beam/static/js/types";
import { getCaptureParams, setCaptureParams } from "../../../capture/static/js/capture";
import { CaptureProperties } from "../../../capture/static/js/types";
import { getDetectorParams, setDetectorParams } from "../../../detector/static/js/detector";
import { DetectorProperties } from "../../../detector/static/js/types";
import { getReconParams, setReconParams } from "../../../reconstruction/static/js/recon";
import { ReconstructionParams } from "../../../reconstruction/static/js/types";
import { getSampleParams, MaterialLib, setSampleParams } from "../../../samples/static/js/samples";
import { SampleProperties, SampleSettings } from "../../../samples/static/js/types";
import { UpdatePage } from "./app";
import { GVXRConfig } from "./formats/GVXRLoader";

// Shorthand for ConfigKeys with all values as true
export const WEBCT_FULL_CONFIG:ConfigKeys = {beam:true, capture:true, detector:true, recon:true, samples:true}

export interface configSubset {
	beam?:BeamProperties;
	detector?:DetectorProperties;
	samples?:SampleSettings
	capture?:CaptureProperties;
	recon?:ReconstructionParams;
}

export interface configFull extends configSubset {
	beam:BeamProperties;
	detector:DetectorProperties;
	samples:SampleSettings
	capture:CaptureProperties;
	recon:ReconstructionParams;
}

export function getConfigKeys(subset:configSubset) {
	return {
		beam:Object.prototype.hasOwnProperty.call(subset, "beam"),
		detector:Object.prototype.hasOwnProperty.call(subset, "detector"),
		samples:Object.prototype.hasOwnProperty.call(subset, "samples"),
		capture:Object.prototype.hasOwnProperty.call(subset, "capture"),
		recon:Object.prototype.hasOwnProperty.call(subset, "recon"),
	};
}


export interface ExportOptions {
	// Export material as an ID, if available
	MatasId:boolean

	// Folder to save projections
	ProjectionFolder:string

	// Folder to save reconstruction
	ReconstructionFolder:string

	// Include gVXR CT scan simulation
	gvxrIncludeScan:boolean

	// Include python CIL reconstruction
	pythonIncludeReconstruction:boolean
}


export class WebCTConfig {
	static to_json(keys:ConfigKeys, options:ExportOptions):configSubset {

		// Options
		console.log(options);
		console.log(keys);

		// Materials as IDs - If true, materials will be refrences, rather than data
		const subset:configSubset = {};

		if (keys.beam) {
			const beamParams = getBeamParms();

			if (beamParams.method == "synch") {
				beamParams.filters = [];
			}

			subset.beam = beamParams;
		}

		if (keys.detector) {
			subset.detector = getDetectorParams();
		}

		if (keys.samples) {
			const sampleParams = getSampleParams();
			if (options.MatasId == false) {
				// Resolve sample materials
				for (let key in sampleParams.samples) {
					const sample:SampleProperties = sampleParams.samples[key];
					const matsplit = sample.materialID?.split("/");
					if (matsplit !== undefined) {
						sample.material = structuredClone(MaterialLib[matsplit[0]][matsplit[1]]);

						const s:any = sample;
						delete s.materialID;
						delete s.material.element;
						delete s.material.weights;
						delete s.material.elements;
						delete s.material.compound;
						sampleParams.samples[key] = s;
					}
				}
			}
			subset.samples = sampleParams;
		}

		if (keys.capture) {
			subset.capture = getCaptureParams();
		}

		if (keys.recon) {
			subset.recon = getReconParams();
		}

		return subset;
	}

	static parse_json(data:unknown):configSubset {
		return data as configSubset;
	}

	static apply(config:configSubset) {
		const keys = getConfigKeys(config);

		if (keys.beam && config.beam !== undefined) {
			setBeamParams(config.beam);
		}

		if (keys.detector && config.detector !== undefined) {
			setDetectorParams(config.detector);
		}

		if (keys.samples && config.samples !== undefined) {
			setSampleParams(config.samples);
		}

		if (keys.capture && config.capture !== undefined) {
			// v1.0.1 - Detector Rotation
			if (!Object.prototype.hasOwnProperty.call(config.detector, "detectorRotation")) {
				config.capture.detectorRotation = [0, 0, 0]
			}
			setCaptureParams(config.capture);
		}

		if (keys.recon && config.recon !== undefined) {
			setReconParams(config.recon);
		}

		UpdatePage();
	}

	static to_text(keys:ConfigKeys, options:ExportOptions):string {
		return JSON.stringify(this.to_json(keys, options), undefined, 4)
	}

	static to_python(keys:ConfigKeys, options:ExportOptions):string {
		// Create a python file to locally simulate and reconstruct WebCT

		// In all cases, we still need gvxr's scan parameters
		options.gvxrIncludeScan = true;
		let config = this.to_json(WEBCT_FULL_CONFIG, options) as configFull

		// Get GVXR config to embed
		let gvxr_config = GVXRConfig.from_config(config, options)

		return `
# Autogenerated by WebCT
from pathlib import Path
from gvxrPython3 import gvxr, json2gvxr, gVXRDataReader

${keys.recon ? `# Core Image Library (CIL) Reconstruction
# Check out the project at https://github.com/TomographicImaging/CIL
from cil.recon import FDK, FBP
from cil.io import TIFFWriter
from cil.processors import TransmissionAbsorptionConverter` : ""}

CONFIG = ${gvxr_config.to_text()}

def check_models(config:dict):
    errors = False
    for sample in config["Samples"]:
        if isinstance(sample, str):
            continue
        path = Path(sample["Path"])
        if not path.exists():
            print(f"\\n************\\nERROR: Cannot find model at '{path}'\\n************\\n")
            errors = True
    if errors:
        raise FileNotFoundError("Missing Model files.")

def setup_gVXR(config:dict) -> None:
    # Check to see if models exist.
    check_models(config)

    # Set cached configuration to embedded config.
    json2gvxr.params = config
    json2gvxr.context_created = True
    json2gvxr.JSON_path = "."

    # initialize gVXR.
    gvxr.createOpenGLContext(-1)

    # Setup gVXR using the json config.
    json2gvxr.initDetector()
    json2gvxr.initSourceGeometry()
    json2gvxr.initSpectrum()
    json2gvxr.initSamples()
    json2gvxr.initScan()
    gvxr.computeXRayImage()

${keys.capture ? `
def simulate():
    # Simulate CT scan (Assumes gVXR has been setup)
    json2gvxr.doCTScan(True)` : ""}
${keys.recon ? `
def reconstruct(out_folder:Path):
    # Load simulated TIFFs, using the current gVXR setup.
    reader = gVXRDataReader.gVXRDataReader(json2gvxr.scan_params["OutFolder"], angle_set=gvxr.getAngleSetCT())
    dataset = reader.read()
    dataset = TransmissionAbsorptionConverter()(dataset)

    # Prepare either FDK or FBP, depending on beam type
    if reader.use_parallel_beam:
        method = FBP(dataset)
    else:
        method = FDK(dataset)

    # Reconstruct
    recon_data = method.run()

    # Save to TIFF
    TIFFWriter(recon_data, out_folder).write()
` : ""}

if __name__ == "__main__":
    # Setup gVXR with the embedded config
    setup_gVXR(CONFIG)
${keys.capture ? `
    # Simulate CT Scan
    # Output is defined in CONFIG
    simulate()` : ""}
${keys.recon ? `
    # Reconstruct simulated CT Scan.
    recon_folder = Path("${options.ReconstructionFolder}")
    reconstruct(recon_folder)` : ""}
    `
	}
}

export interface ConfigKeys {
	beam:boolean,
	detector:boolean,
	samples:boolean,
	capture:boolean,
	recon:boolean,
}

export enum ExportModes {
	JSON,
	GVXR,
	XTEK,
	PYTHON,
	DIONDO
}

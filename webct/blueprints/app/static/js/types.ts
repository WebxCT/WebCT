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


export enum ExportOptions {
	MatasId = 1 << 0,
	GVXR = 2 << 0,
}


export class WebCTConfig {
	static to_json(keys:ConfigKeys, options:ExportOptions[]):configSubset {

		// Options
		console.log(options);
		console.log(keys);

		// Materials as IDs - If true, materials will be refrences, rather than data
		const optMatasID = options.includes(ExportOptions.MatasId);
		console.log(optMatasID);

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
			if (optMatasID == false) {
				// Resolve materials
				for (let index = 0; index < sampleParams.samples.length; index++) {
					const sample:SampleProperties = sampleParams.samples[index];
					const matsplit = sample.materialID?.split("/");
					if (matsplit !== undefined) {
						sample.material = structuredClone(MaterialLib[matsplit[0]][matsplit[1]]);

						const s:any = sample;
						delete s.materialID;
						delete s.material.element;
						delete s.material.weights;
						delete s.material.elements;
						delete s.material.compound;
						sampleParams.samples[index] = s;
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
			setCaptureParams(config.capture);
		}

		if (keys.recon && config.recon !== undefined) {
			setReconParams(config.recon);
		}

		UpdatePage();
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
	XTEK
}

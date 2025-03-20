/**
 * api.ts : API functions for communicating between the client and server.
 * @author Iwan Mitchell
 */
import { CapturePreview, CaptureProperties } from "./types";

// ====================================================== //
// ====================== Endpoints ===================== //
// ====================================================== //

/**
 * Capture API endpoints
 */
const Endpoint = {
	getCaptureData: "capture/get",
	setCaptureData: "capture/set",
	getCapturePreview: "capture/preview/get",
};

// ====================================================== //
// ====================== Structure ===================== //
// ====================================================== //

/**
 * Registry containing direct-api transmission responses before conversion to
 * correct types.
 *
 * @remarks
 * Note: name of attributes must match those of the server-side API
 * implementation.
 */
export interface CaptureResponseRegistry {
	/**
	 * Response given when retrieving capture data with the getCaptureData Endpoint.
	 */
	captureResponse: {
		projections: number;
		capture_angle: number;
		detector_position: [number, number, number];
		detector_rotation: [number, number, number];
		beam_position: [number, number, number];
		sample_rotation: [number, number, number];
		laminography_mode: boolean;
	};
	/**
	 * Response given when retrieving a preview of the capture plan.
	 */
	capturePreviewResponse: {
		gif_str:string;
		height:number;
		width:number;
	}
}

/**
 * Registry containing direct-api transmission requests after conversion from
 * types.
 *
 * @remarks
 * Note: name of attributes must match those of the server-side API
 * implementation.
 */
export interface CaptureRequestRegistry {
	/**
	 * Request given when attempting to change capture parameters.
	 */
	captureRequest: {
		projections: number;
		capture_angle: number,
		detector_position: [number, number, number];
		detector_rotation: [number, number, number];
		beam_position: [number, number, number];
		sample_rotation: [number, number, number];
		laminography_mode: boolean;
	}
}

// ====================================================== //
// ==================== Transmission ==================== //
// ====================================================== //

/**
 * Request capture data from the server.
 * @returns Potentially raw data from the capture data endpoint.
 */
export async function requestCaptureData(): Promise<Response> {
	return await fetch(Endpoint.getCaptureData);
}

/**
 * Request a capture preview from the server.
 * @returns Potentially raw data from the capture preview endpoint.
 */
export async function requestCapturePreview(): Promise<Response> {
	return await fetch(Endpoint.getCapturePreview);
}

/**
 * Send capture parameters to the server.
 * @param data - Capture Properties to update on the server
 * @returns Potentially status codes symbolising the result of the put request.
 */
export async function sendCaptureData(data: CaptureRequestRegistry["captureRequest"]): Promise<Response> {
	return await fetch(Endpoint.setCaptureData, {
		method: "PUT",
		body: JSON.stringify(data),
		headers: {
			"Content-Type": "application/json"
		}
	});
}

// ====================================================== //
// ===================== Conversion ===================== //
// ====================================================== //

/**
 * Convert API response data into local typescript objects.
 * @param data - unconverted objects created from a getCapture request.
 * @returns Capture Properties, Unfiltered spectra data, and filtered spectra data.
 */
export function processResponse(data: CaptureResponseRegistry[keyof CaptureResponseRegistry], type: keyof CaptureResponseRegistry): CaptureProperties | CapturePreview {
	switch (type) {
	case "capturePreviewResponse":
		data = data as CaptureResponseRegistry["capturePreviewResponse"];
		return {
			gifString: data.gif_str,
			width: data.width,
			height: data.height,
		};
	case "captureResponse":
	default:
		data = data as CaptureResponseRegistry["captureResponse"];
		return {
			numProjections: data.projections,
			totalAngle: data.capture_angle as 180 | 360,
			beamPosition: data.beam_position,
			detectorPosition: data.detector_position,
			detectorRotation: data.detector_rotation,
			sampleRotation: data.sample_rotation,
			laminographyMode: data.laminography_mode,
		};
	}
}

/**
 * Convert capture properties into structured API request data.
 * @param data - Capture properties to be sent to the server.
 */
export function prepareRequest(data: CaptureProperties): CaptureRequestRegistry["captureRequest"] {
	return {
		capture_angle:data.totalAngle,
		projections:data.numProjections,
		beam_position:data.beamPosition,
		detector_position:data.detectorPosition,
		detector_rotation: data.detectorRotation,
		sample_rotation:data.sampleRotation,
		laminography_mode: data.laminographyMode,
	};
}

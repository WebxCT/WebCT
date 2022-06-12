/**
 * api.ts : API functions for communicating between the client and server.
 * @author Iwan Mitchell
 */
import { DetectorProperties } from "./types";

// ====================================================== //
// ====================== Endpoints ===================== //
// ====================================================== //

/**
 * Detector API endpoints
 */
const Endpoint = {
	getDetectorData: "detector/get",
	setDetectorData: "detector/set",
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
export interface DetectorResponseRegistry {
	/**
	 * Response given when retrieving detector data with the getDetectorData Endpoint.
	 */
	detectorResponse: {
		params: {
			pane_width: number;
			pane_height: number;
			pixel_size: number;
		},
	};
}

/**
 * Registry containing direct-api transmission requests after conversion from
 * types.
 *
 * @remarks
 * Note: name of attributes must match those of the server-side API
 * implementation.
 */
export interface DetectorRequestRegistry {
	/**
	 * Request given when attempting to change detector parameters.
	 */
	detectorRequest: {
		pane_width: number;
		pane_height: number;
		pixel_size: number;
	}
}

// ====================================================== //
// ==================== Transmission ==================== //
// ====================================================== //

/**
 * Request detector data from the server.
 * @returns Potentially raw data from the detector data endpoint.
 */
export async function requestDetectorData(): Promise<Response> {
	return await fetch(Endpoint.getDetectorData);
}

/**
 * Send detector parameters to the server.
 * @param data - Detector Properties to update on the server
 * @returns Potentially status codes symbolising the result of the put request.
 */
export async function sendDetectorData(data: DetectorRequestRegistry["detectorRequest"]): Promise<Response> {
	return await fetch(Endpoint.setDetectorData, {
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
 * @param data - unconverted objects created from a getDetector request.
 * @returns Detector Properties, Unfiltered spectra data, and filtered spectra data.
 */
export function processResponse(data: DetectorResponseRegistry["detectorResponse"]): DetectorProperties {
	const detector: DetectorProperties = {
		paneHeight: data.params.pane_height,
		paneWidth: data.params.pane_width,
		pixelSize: data.params.pixel_size
	};

	return detector;
}

/**
 * Convert detector properties into structured API request data.
 * @param data - Detector properties to be sent to the server.
 */
export function prepareRequest(data: DetectorProperties): DetectorRequestRegistry["detectorRequest"] {
	return {
		pane_height:data.paneHeight,
		pane_width:data.paneWidth,
		pixel_size:data.pixelSize
	};
}

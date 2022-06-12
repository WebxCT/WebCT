/**
 * api.ts : API functions for communicating between the client and server.
 * @author Iwan Mitchell
 */
import { CGLSParams, CGLSVariant, FBPParams, FDKParams, ReconMethod, ReconQuality, ReconstructionParams, ReconstructionPreview } from "./types";

// ====================================================== //
// ====================== Endpoints ===================== //
// ====================================================== //

/**
 * Recon API endpoints
 */
const Endpoint = {
	getReconData: "recon/get",
	setReconData: "recon/set",
	getReconPreview: "recon/preview/get",
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
export interface ReconResponseRegistry {
	/**
	 * Response given when retrieving recon data with the getReconData Endpoint.
	 */
	reconResponse: {
		quality: ReconQuality;
		method: ReconMethod;
		[key: string]: string | number | boolean;
	};

	reconPreviewResponse: {
		recon: {
			video:string,
			height:number,
			width:number,
		},
		slice: {
			video:string,
			height:number,
			width:number,
		},
		sino: {
			video:string,
			height:number,
			width:number,
		}
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
export interface ReconRequestRegistry {
	/**
	 * Request given when attempting to change recon parameters.
	 */
	reconRequest: {
		quality: ReconQuality;
		method: ReconMethod;
		[key: string]: string | number | boolean;
	}
}

// ====================================================== //
// ==================== Transmission ==================== //
// ====================================================== //

/**
 * Request recon data from the server.
 * @returns Potentially raw data from the recon data endpoint.
 */
export async function requestReconData(): Promise<Response> {
	return await fetch(Endpoint.getReconData);
}

/**
 * Request recon data from the server.
 * @returns Potentially raw data from the recon data endpoint.
 */
 export async function requestReconPreview(): Promise<Response> {
	return await fetch(Endpoint.getReconPreview);
}

/**
 * Send recon parameters to the server.
 * @param data - Recon Properties to update on the server
 * @returns Potentially status codes symbolising the result of the put request.
 */
export async function sendReconData(data: ReconRequestRegistry["reconRequest"]): Promise<Response> {
	console.log("sendReconData()");
	return await fetch(Endpoint.setReconData, {
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
 * @param data - unconverted objects created from a getRecon request.
 * @returns Recon Properties, Unfiltered spectra data, and filtered spectra data.
 */
export function processResponse(data: ReconResponseRegistry[keyof ReconResponseRegistry], type: keyof ReconResponseRegistry): ReconstructionParams | ReconstructionPreview | undefined {
	// Todo: Convert and check params for each reconstruction method
	switch (type) {
		case "reconResponse":
			data = data as ReconResponseRegistry["reconResponse"]
			switch (data.method) {
				case "FBP":
					return {
						quality: data.quality,
						method: data.method,
						filter: data.filter,
					} as FBPParams
				case "FDK":
					return {
						quality: data.quality,
						method: data.method,
						filter: data.filter,
					} as FDKParams
				case "CGLS":
					return {
						quality: data.quality,
						method: data.method,
						variant: data.variant as CGLSVariant,
						iterations:100,
					} as CGLSParams
				default:
					break;
			}
			break;
		case "reconPreviewResponse":
			// Todo: convert and check params
			data = data as ReconResponseRegistry["reconPreviewResponse"]
			return data as ReconstructionPreview;
	}
	return undefined
}

/**
 * Convert recon properties into structured API request data.
* @param data - Recon properties to be sent to the server.
*/
export function prepareRequest(data: ReconstructionParams): ReconRequestRegistry["reconRequest"] {
	// Todo: Convert and check params for each reconstruction method
	return data as unknown as ReconRequestRegistry["reconRequest"]
}

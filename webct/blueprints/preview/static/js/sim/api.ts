/**
 * api.ts : API functions for communicating between the client and server.
 * @author Iwan Mitchell
 */

import { PreviewData } from "./types";

// ====================================================== //
// ====================== Endpoints ===================== //
// ====================================================== //

/**
 * Sim API endpoints
 */
const Endpoint = {
	getPreviews: "sim/preview/get",
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
export interface SimResponseRegistry {
	/**
	 * Response given when retrieving sim data with the getSimData Endpoint.
	 */
	simResponse: {
		time:number,
		projection: {
			image:string,
			height:number,
			width:number
		},
		layout: {
			image:string,
			height:number,
			width:number
		}
	};
}

// ====================================================== //
// ==================== Transmission ==================== //
// ====================================================== //

export async function requestProjection(): Promise<Response> {
	return await fetch(Endpoint.getPreviews);
}

// ====================================================== //
// ===================== Conversion ===================== //
// ====================================================== //

/**
 * Convert API response data into local typescript objects.
 * @param data - unconverted objects created from a getSim request.
 * @returns Sim Properties, Unfiltered spectra data, and filtered spectra data.
 */
export function processResponse(data: SimResponseRegistry["simResponse"]): PreviewData {

	const preview: PreviewData = {
		time: data.time,
		projection: {
			image: data.projection.image,
			height: data.projection.height,
			width: data.projection.width,
		},
		layout: {
			image: data.layout.image,
			height: data.layout.height,
			width: data.layout.width,
		}
	};

	return preview;
}

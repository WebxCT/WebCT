/**
 * api.ts : API functions for communicating between the client and server.
 * @author Iwan Mitchell
 */
import { BoxProximal, CGLSParams, Proximal, Differentiable, FBPParams, FDKParams, FGPTVProximal, FISTAParams, LeastSquaresDiff, ReconMethod, ReconQuality, ReconstructionParams, ReconstructionPreview, SIRTParams, TGVProximal, TikhonovRegulariser, TVProximal } from "./types";

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
		[key: string]: string | number | boolean | TikhonovRegulariser | Proximal | Differentiable;
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

function processTikhonov(data:ReconResponseRegistry["reconResponse"]):TikhonovRegulariser {
	return {
		method: (data.operator as TikhonovRegulariser).method,
		params: {
			alpha: (data.operator as TikhonovRegulariser).params.alpha,
			boundary: (data.operator as TikhonovRegulariser).params.boundary,
		},
	} as TikhonovRegulariser;
}

function processProximal(data:ReconResponseRegistry["reconResponse"]):Proximal {
	const dataProximal = data.constraint as Proximal;
	switch (dataProximal.method) {
	case "box":
		return {
			method: dataProximal.method,
			params: {
				upper: dataProximal.params.upper,
				lower: dataProximal.params.lower,
			}
		} as BoxProximal;
	case "tv":
		return {
			method: dataProximal.method,
			params: {
				isotropic: dataProximal.params.isotropic,
				iterations: dataProximal.params.iterations,
				tolerance: dataProximal.params.tolerance,
				lower: dataProximal.params.lower,
				upper: dataProximal.params.upper,
			}
		} as TVProximal;
	case "fgp-tv":
		return {
			method: "fgp-tv",
			params: {
				alpha: dataProximal.params.alpha,
				isotropic: dataProximal.params.isotropic,
				iterations: dataProximal.params.iterations,
				nonnegativity: dataProximal.params.nonnegativity,
				tolerance: dataProximal.params.tolerance,
			}
		} as FGPTVProximal;
	case "tgv":
		return {
			method: "tgv",
			params: {
				alpha: dataProximal.params.alpha,
				gamma: dataProximal.params.gamma,
				iterations: dataProximal.params.iterations,
				tolerance: dataProximal.params.tolerance
			}
		} as TGVProximal;
	default:
		return {
			method: "box",
			params: {
				upper: null,
				lower: null,
			}
		} as BoxProximal;
	}
}

function processDiff(data:ReconResponseRegistry["reconResponse"]):Differentiable {
	const dataDiff = data.diff as Differentiable;
	switch (dataDiff.method) {
	case "least-squares":
		return {
			method: "least-squares",
			params: {
				scaling_constant: dataDiff.params.scaling_constant,
			}
		} as LeastSquaresDiff;
	default:
		return {
			method: "least-squares",
			params: {
				scaling_constant: 1,
			}
		};
	}
}

/**
 * Convert API response data into local typescript objects.
 * @param data - unconverted objects created from a getRecon request.
 * @returns Recon Properties, Unfiltered spectra data, and filtered spectra data.
 */
export function processResponse(data: ReconResponseRegistry[keyof ReconResponseRegistry], type: keyof ReconResponseRegistry): ReconstructionParams | ReconstructionPreview | undefined {
	// Todo: Convert and check params for each reconstruction method

	switch (type) {
	case "reconResponse":
		data = data as ReconResponseRegistry["reconResponse"];
		switch (data.method) {
		case "FBP":
			return {
				quality: data.quality,
				method: data.method,
				filter: data.filter,
			} as FBPParams;
		case "FDK":
			return {
				quality: data.quality,
				method: data.method,
				filter: data.filter,
			} as FDKParams;
		case "CGLS":
			return {
				quality: data.quality,
				method: data.method,
				iterations: data.iterations,
				tolerance: data.tolerance,
				operator: processTikhonov(data),
			} as CGLSParams;
		case "SIRT":
			return {
				quality: data.quality,
				method: data.method,
				iterations: data.iterations,
				operator: processTikhonov(data),
				constraint: processProximal(data),
			} as SIRTParams;
		case "FISTA":
			return {
				quality: data.quality,
				method: data.method,
				iterations: data.iterations,
				constraint: processProximal(data),
				diff: processDiff(data),
			} as FISTAParams;
		}
		break;
	case "reconPreviewResponse":
		// Todo: convert and check params
		data = data as ReconResponseRegistry["reconPreviewResponse"];
		return data as ReconstructionPreview;
	}
	return undefined;
}

/**
 * Convert recon properties into structured API request data.
* @param data - Recon properties to be sent to the server.
*/
export function prepareRequest(data: ReconstructionParams): ReconRequestRegistry["reconRequest"] {
	// Todo: Convert and check params for each reconstruction method
	return data as unknown as ReconRequestRegistry["reconRequest"];
}

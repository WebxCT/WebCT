/**
 * api.ts : API functions for communicating between the client and server.
 * @author Iwan Mitchell
 */

import { DetectorRequestError, showError } from "./errors";
import { MaterialLibrary, Material, SampleProperties } from "./types";

// ====================================================== //
// ====================== Endpoints ===================== //
// ====================================================== //

/**
 * Sample API endpoints
 */
const Endpoint = {
	getSampleData: "samples/get",
	setSampleData: "samples/set",
	listSamples: "samples/list",
	uploadSamples: "samples/upload",
	listMaterials: "material/list",
	setMaterial: "material/set",
};

// ====================================================== //
// ====================== Structure ===================== //
// ====================================================== //

type MaterialTransmission = {
	label: string,
	description: string,
	density: number,
	material: ["element" | "compound", string] | ["hu", number] | ["mixture", (string | number)[]] | ["special", "air"]
}

/**
 * Registry containing direct-api transmission responses before conversion to
 * correct types.
 *
 * @remarks
 * Note: name of attributes must match those of the server-side API
 * implementation.
 */
export interface SamplesResponseRegistry {
	/**
	 * Response given when retrieving samples data with the getSampleData Endpoint.
	 */
	sampleDataResponse: {
		samples:
		{
			label: string,
			materialID: string,
			modelPath: string,
			sizeUnit: string,
		}[];
	};
	/**
	 * Response given when using listSamples
	 */
	sampleListResponse: {
		files: string[],
	};

	/**
	 * Response of materials and their properties
	 */
	materialListResponse: {
		[key: string]: {
			[key: string]: MaterialTransmission,
		};
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
export interface SamplesRequestRegistry {
	/**
	 * Request given when attempting to change samples parameters.
	 */
	sampleDataRequest: {
		samples:
		{
			label: string,
			materialID: string,
			modelPath: string,
			sizeUnit: string,
		}[];
	};
	/**
	 * Request sent when attempting to change material preset parameters.
	 */
	materialDataRequest: {
		label: string;
		description: string;
		density: number,
		material: ["element" | "compound", string] | ["hu", number] | ["mixture", (string | number)[]] | ["special", "air"]
		category: string,
	};
}

// ====================================================== //
// ==================== Transmission ==================== //
// ====================================================== //

/**
 * Request samples data from the server.
 * @returns Potentially raw data from the samples data endpoint.
 */
export async function requestSampleData(): Promise<Response> {
	return await fetch(Endpoint.getSampleData);
}

/**
 * Request a list of available samples on the server.
 * @returns Potentially raw data from the sample list endpoint.
 */
export async function requestModelList(): Promise<Response> {
	return await fetch(Endpoint.listSamples);
}

/**
 * Request a list of available samples on the server.
 * @returns Potentially raw data from the sample list endpoint.
 */
export async function requestMaterialList(): Promise<Response> {
	return await fetch(Endpoint.listMaterials);
}

/**
 * Send sample parameters to the server.
 * @param data - Sample Properties to update on the server
 * @returns Potentially status codes symbolising the result of the put request.
 */
export async function sendSamplesData(data: SamplesRequestRegistry["sampleDataRequest"]): Promise<Response> {
	return await fetch(Endpoint.setSampleData, {
		method: "PUT",
		body: JSON.stringify(data),
		headers: {
			"Content-Type": "application/json"
		}
	});
}

/**
 * Upload new material properties to the server.
 * @param data - Material Properties to update on the server
 * @returns Potentially status codes symbolising the result of the put request.
 */
export async function sendMaterialData(data: SamplesRequestRegistry["materialDataRequest"]): Promise<Response> {
	return await fetch(Endpoint.setMaterial, {
		method: "PUT",
		body: JSON.stringify(data),
		headers: {
			"Content-Type": "application/json"
		}
	});
}

/**
 * Prepare a XMLHttpRequest for use to uploading model data to the server.
 * @returns An XMLHttpRequest object configured an endpoint.
 */
export function uploadSample(): XMLHttpRequest {
	const request = new XMLHttpRequest();
	request.open("POST", Endpoint.uploadSamples);
	return request;
}

// ====================================================== //
// ===================== Conversion ===================== //
// ====================================================== //

/**
 * Convert API response data into local typescript objects.
 * @param data - unconverted objects created from a getSamples request.
 * @returns Samples Properties, Unfiltered spectra data, and filtered spectra data.
 */
export function processResponse(data: SamplesResponseRegistry[keyof SamplesResponseRegistry], type: keyof SamplesResponseRegistry): SampleProperties[] | string[] | MaterialLibrary {
	// can't declare variables in switch statements...
	const samples: SampleProperties[] = [];
	const files: string[] = [];

	switch (type) {
		case "sampleDataResponse":
			data = data as SamplesResponseRegistry["sampleDataResponse"];
			for (let index = 0; index < data.samples.length; index++) {
				const sample = data.samples[index];

				samples.push({
					label: sample.label,
					modelPath: sample.modelPath,
					materialID: sample.materialID,
					sizeUnit: sample.sizeUnit,
				});
			}
			return samples;
		case "sampleListResponse":
			data = data as SamplesResponseRegistry["sampleListResponse"];
			for (let index = 0; index < data.files.length; index++) {
				const file = data.files[index];
				files.push(file);
			}
			return files;
		case "materialListResponse":
			data = data as SamplesResponseRegistry["materialListResponse"];
			// convert data into material objects and store in an object format
			console.log(data);
			for (const key in data) {
				if (Object.prototype.hasOwnProperty.call(data, key)) {
					const element = data[key];
					console.log(element);
				}
			}
			return data as unknown as MaterialLibrary;
	}
}

/**
 * Convert samples properties into structured API request data.
 * @param data - Sample properties to be sent to the server.
 */
export function prepareSampleRequest(data: SampleProperties[]): SamplesRequestRegistry["sampleDataRequest"] {
	const samples: SamplesRequestRegistry["sampleDataRequest"] = {
		samples: []
	};

	for (let index = 0; index < data.length; index++) {
		const sample = data[index];
		samples.samples.push({
			label: sample.label,
			materialID: sample.materialID,
			modelPath: sample.modelPath,
			sizeUnit: sample.sizeUnit,
		});
	}

	return samples;
}

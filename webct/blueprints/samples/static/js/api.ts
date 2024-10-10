/**
 * api.ts : API functions for communicating between the client and server.
 * @author Iwan Mitchell
 */

import { MaterialLibrary, Material, SampleProperties, SamplePropertiesID, SampleSettings } from "./types";

// ====================================================== //
// ====================== Endpoints ===================== //
// ====================================================== //

/**
 * Sample API endpoints
 */
const Endpoint = {
	getSampleData: "samples/get",
	setSampleData: "samples/set",
	listModels: "samples/list",
	uploadModels: "samples/upload",
	listMaterials: "material/list",
	setMaterial: "material/set",
	deleteMaterial: "material/delete",
};

// ====================================================== //
// ====================== Structure ===================== //
// ====================================================== //

type MaterialTransmission = {
	label: string,
	description: string,
	density: number,
	material: ["element" | "compound", string] | ["hu", number] | ["mixture", (string | number)[]];
};

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
		scaling: number,
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
		scaling: number,
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
		material: ["element" | "compound", string] | ["hu", number] | ["mixture", (string | number)[]];
		category: string,
	};

	/**
	 * Request sent when deleting an existing material.
	 */
	materialDeleteRequest: {
		categoryID: string,
		materialID: string,
	}
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
	return await fetch(Endpoint.listModels);
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
export function uploadModel(): XMLHttpRequest {
	const request = new XMLHttpRequest();
	request.open("POST", Endpoint.uploadModels);
	return request;
}

export async function deleteMaterialData(data: SamplesRequestRegistry["materialDeleteRequest"]): Promise<Response> {
	return await fetch(Endpoint.deleteMaterial, {
		method: "DELETE",
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
 * @param data - unconverted objects created from a getSamples request.
 * @returns Samples Properties, Unfiltered spectra data, and filtered spectra data.
 */
export function processResponse(data: SamplesResponseRegistry[keyof SamplesResponseRegistry], type: keyof SamplesResponseRegistry): SampleSettings | string[] | MaterialLibrary {
	// can't declare variables in switch statements...
	const samples: SampleProperties[] = [];
	const files: string[] = [];
	let mixtureMat: [string, number][] = [];

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
		return {
			scaling: data.scaling,
			samples: samples
		};
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
		for (const key in data) {
			if (Object.prototype.hasOwnProperty.call(data, key)) {
				const category = data[key];
				for (const matKey in category) {
					if (Object.prototype.hasOwnProperty.call(category, matKey)) {
						const material = category[matKey];
						if ("material" in material) {
							if (material.material[0] == "mixture") {
								if (material.material[1].length % 2 != 0) {
									console.error("Received an invalid mixture material in '" + key + "/" + matKey + "'");
									continue;
								}
								mixtureMat = [];
								for (let index = 0; index < material.material[1].length; index += 2) {
									const element = material.material[1][index] + "";
									const weight = parseFloat(material.material[1][index + 1] + "");
									mixtureMat.push([element, weight * 100]);
								}
								(data[key][matKey] as Material).material[1] = mixtureMat;
							}
						}
					}

				}
			}
		}
		return data as unknown as MaterialLibrary;
	}
}

/**
 * Convert samples properties into structured API request data.
 * @param data - Sample properties to be sent to the server.
 */
export function prepareSampleRequest(data: SamplePropertiesID[], scaling:number): SamplesRequestRegistry["sampleDataRequest"] {
	const samples: SamplesRequestRegistry["sampleDataRequest"] = {
		samples: [],
		scaling: scaling
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

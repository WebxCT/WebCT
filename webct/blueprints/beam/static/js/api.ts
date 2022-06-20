/**
 * api.ts : API functions for communicating between the client and server.
 * @author Iwan Mitchell
 */
import { Element } from "../../../base/static/js/types";
import { SpectraData, BeamProperties } from "./types";

// ====================================================== //
// ====================== Endpoints ===================== //
// ====================================================== //

/**
 * Beam API endpoints
 */
const Endpoint = {
	getBeamData: "beam/get",
	setBeamData: "beam/set",
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
export interface BeamResponseRegistry {
	/**
	 * Response given when retrieving beam data with the getBeamData Endpoint.
	 */
	beamResponse: {
		params: {
			electron_energy: number;
			emission_angle: number;
			source_material: number;
			filters: Array<{ filterElement: number, filterThickness: number; }>;
			generator: string;
			projection: string;
		},
		filteredSpectra: {
			energies: Array<number>;
			photons: Array<number>;
			kerma: number;
			flu: number;
			emean: number;
		},
		unfilteredSpectra: {
			energies: Array<number>;
			photons: Array<number>;
			kerma: number;
			flu: number;
			emean: number;
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
export interface BeamRequestRegistry {
	/**
	 * Request given when attempting to change beam parameters.
	 */
	beamRequest: {
		electron_energy: number;
		emission_angle: number,
		source_material: Element;
		filters: Array<{ filterElement: number, filterThickness: number; }>;
		generator: string
		projection: string
	}
}

// ====================================================== //
// ==================== Transmission ==================== //
// ====================================================== //

/**
 * Request beam data from the server.
 * @returns Potentially raw data from the beam data endpoint.
 */
export async function requestBeamData(): Promise<Response> {
	return await fetch(Endpoint.getBeamData);
}

/**
 * Send beam parameters to the server.
 * @param data - Beam Properties to update on the server
 * @returns Potentially status codes symbolising the result of the put request.
 */
export async function sendBeamData(data: BeamRequestRegistry["beamRequest"]): Promise<Response> {
	return await fetch(Endpoint.setBeamData, {
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
 * @param data - unconverted objects created from a getBeam request.
 * @returns Beam Properties, Unfiltered spectra data, and filtered spectra data.
 */
export function processResponse(data: BeamResponseRegistry["beamResponse"]): [BeamProperties, SpectraData, SpectraData] {
	const filteredSpectra: SpectraData = {
		energies: data.filteredSpectra.energies,
		photons: data.filteredSpectra.photons,

		kerma: data.filteredSpectra.kerma,
		flu: data.filteredSpectra.flu,
		emean: data.filteredSpectra.emean,
	};

	const unfilteredSpectra: SpectraData = {
		energies: data.unfilteredSpectra.energies,
		photons: data.unfilteredSpectra.photons,

		kerma: data.unfilteredSpectra.kerma,
		flu: data.unfilteredSpectra.flu,
		emean: data.unfilteredSpectra.emean,
	};

	const properties: BeamProperties = {
		tubeVoltage: data.params.electron_energy,
		emissionAngle: data.params.emission_angle,
		sourceMaterial: data.params.source_material,
		filters: [
			{
				material: data.params.filters[0].filterElement,
				thickness: data.params.filters[0].filterThickness
			}
		],
		beamGenerator: data.params.generator,
		beamProjection: data.params.projection,
	};

	return [
		properties,
		filteredSpectra,
		unfilteredSpectra,
	];
}

/**
 * Convert beam properties into structured API request data.
 * @param data - Beam properties to be sent to the server.
 */
export function prepareRequest(data: BeamProperties): BeamRequestRegistry["beamRequest"] {
	return {
		filters: [
			{
				filterElement:data.filters[0].material,
				filterThickness:data.filters[0].thickness,
			}
		],
		electron_energy: data.tubeVoltage,
		source_material: data.sourceMaterial,
		emission_angle: data.emissionAngle,
		generator: data.beamGenerator,
		projection: data.beamProjection
	};
}

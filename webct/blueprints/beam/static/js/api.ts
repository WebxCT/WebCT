/**
 * api.ts : API functions for communicating between the client and server.
 * @author Iwan Mitchell
 */
import { Element } from "../../../base/static/js/types";
import { SpectraData, BeamProperties, SourceType, BeamGenerator, LabBeam, Filter, MedBeam, SynchBeam } from "./types";

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
			method: SourceType;
			enableNoise:boolean;
			voltage?: number;
			energy?: number;
			exposure?:number;
			intensity?:number;
			flux?:number;
			spotSize?:number;
			material?:number;
			anodeAngle?:number;
			generator?:BeamGenerator
			harmonics?:boolean;
			mas?:number;
			filters: Array<{ material: number, thickness: number; }>;
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
export async function sendBeamData(data: BeamProperties): Promise<Response> {
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

	const filters:Array<Filter> = [];

	for (let index = 0; index < data.params.filters.length; index++) {
		const filter = data.params.filters[index];
		filters.push({
			material: filter.material,
			thickness: filter.thickness,
		});
	}
	let beamProperties:BeamProperties;

	switch (data.params.method) {
	default:
	case "lab":
		beamProperties = new LabBeam(
			data.params.voltage as number,
			data.params.enableNoise as boolean,
			data.params.exposure as number,
			data.params.intensity as number,
			data.params.spotSize as number,
			data.params.material as number,
			data.params.generator as BeamGenerator,
			data.params.anodeAngle as number,
			filters
		);
		break;
	case "med":
		beamProperties = new MedBeam(
			data.params.voltage as number,
			data.params.enableNoise as boolean,
			data.params.mas as number,
			data.params.spotSize as number,
			data.params.material as number,
			data.params.generator as BeamGenerator,
			data.params.anodeAngle as number,
			filters
		);
		break;
	case "synch":
		beamProperties = new SynchBeam(
			data.params.energy as number,
			data.params.enableNoise as boolean,
			data.params.exposure as number,
			data.params.flux as number,
			data.params.harmonics as boolean,
			filters,
		);
		break;
	}

	return [
		beamProperties,
		filteredSpectra,
		unfilteredSpectra,
	];
}

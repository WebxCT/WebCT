/**
 * api.ts : API functions for communicating between the client and server.
 * @author Iwan Mitchell
 */
import { DigitalTwin } from "./types";

// ====================================================== //
// ====================== Endpoints ===================== //
// ====================================================== //

/**
 * Twin API endpoints
 */
const Endpoint = {
	getTwin: "twins/get",
	setTwin: "twins/set",
	listTwins: "twins/list",
};

// ====================================================== //
// ====================== Structure ===================== //
// ====================================================== //

export interface SelectedTwin {
	name: string
}

// ====================================================== //
// ==================== Transmission ==================== //
// ====================================================== //

/**
 * Request current twin from the server
 * @returns Potentially raw data from the beam data endpoint.
 */
export async function requestCurrentTwin(): Promise<Response> {
	return await fetch(Endpoint.getTwin);
}

/**
 * Send selected twin to the server
 * @param twinName - Name of twin for backend to use for current sessiojn
 * @returns Potentially status codes symbolising the result of the put request.
 */
export async function sendSelectedTwin(twin: SelectedTwin): Promise<Response> {
	return await fetch(Endpoint.setTwin, {
		method: "PUT",
		body: JSON.stringify(twin),
		headers: {
			"Content-Type": "application/json"
		}
	});
}

/**
 * Request full list and details of supported digital twins
 * @returns Potentially the full list and specifications of all digital twins
 */
export async function listDigitalTwins(): Promise<Response> {
	return await fetch(Endpoint.listTwins)
}

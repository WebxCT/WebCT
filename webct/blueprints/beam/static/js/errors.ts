/**
 * Errors.ts : Error handling and display for the beam module.
 * @author Iwan Mitchell
 */

import { AlertType, showAlert } from "../../../base/static/js/base";

// ====================================================== //
// ======================= Errors ======================= //
// ====================================================== //

/**
 * Errors regarding beam parameters
 */
export enum BeamConfigError {
	TUBE_UNSUPPORTED_MATERIAL = "Unsupported Tube Material",
	TUBE_UNSUPPORTED_ENERGY = "Unsupported Tube Energy",
	TUBE_UNSUPPORTED_ANGLE = "Unsupported Tube Angle",
}

/**
 * Errors regarding transmission and communication with the API
 */
export enum BeamRequestError {
	RESPONSE_DECODE = "Unable To Decode Beam Data",
	UNEXPECTED_SERVER_ERROR = "Server Errored Unexpectedly",
	UNSUPPORTED_PARAMETERS = "Unsupported Parameters",
	SEND_ERROR = "Sending Update Request Failed",
}

type BeamError = BeamRequestError | BeamConfigError;

// ====================================================== //
// ======================= Display ====================== //
// ====================================================== //

const beamErrorMessages = new Map<BeamError, string>([
	[BeamConfigError.TUBE_UNSUPPORTED_MATERIAL, "The physics model does not support the provided tube material. <strong>Please select a different material.</strong>"],
	[ BeamConfigError.TUBE_UNSUPPORTED_ENERGY,  "The physics model does not support the provided tube energy. <strong>Please select a different voltage.</strong>"],
	[ BeamConfigError.TUBE_UNSUPPORTED_ANGLE,   "The physics model does not support the provided tube angle. <strong>Please select a different angle.</strong>"],
	[ BeamRequestError.RESPONSE_DECODE,         "A malformed response was received from the server. <strong>Trying again may fix the issue.</strong>"],
	[ BeamRequestError.UNEXPECTED_SERVER_ERROR, "The server returned an error unexpectedly. <strong>Trying again may fix the issue.</strong>"],
	[ BeamRequestError.UNSUPPORTED_PARAMETERS,  "Unsupported parameters were declined by the server."],
	[ BeamRequestError.SEND_ERROR,              "Failed to send beam update request. <strong>Are you connected to the internet?</strong>"],
]);

/**
 * Report and display an error to the user.
 * @param errorType - Type of error to report
 */
export function showError(errorType: BeamError): void {
	const message = beamErrorMessages.has(errorType) ? beamErrorMessages.get(errorType) as string : "An unexpected error has occurred.<br><b>" + errorType + "</b>";

	console.error(errorType + " : " + message);
	showAlert(message, AlertType.ERROR);
	return;
}

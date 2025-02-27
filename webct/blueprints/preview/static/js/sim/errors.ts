/**
 * Errors.ts : Error handling and display for the beam module.
 * @author Iwan Mitchell
 */

import { AlertType, showAlert } from "../../../../base/static/js/base";

// ====================================================== //
// ======================= Errors ======================= //
// ====================================================== //

/**
 * Errors regarding transmission and communication with the API
 */
export enum ProjectionRequestError {
	RESPONSE_DECODE = "Unable To Decode Projection Data",
	UNEXPECTED_SERVER_ERROR = "Server Errored Unexpectedly",
	SEND_ERROR = "Sending Update Request Failed",
}

type SimError = ProjectionRequestError;

// ====================================================== //
// ======================= Display ====================== //
// ====================================================== //

const projectionErrorMessages = new Map<SimError, string>([
	[ ProjectionRequestError.RESPONSE_DECODE,         "A malformed response was received from the server. <strong>Trying again may fix the issue.</strong>"],
	[ ProjectionRequestError.UNEXPECTED_SERVER_ERROR, "The server returned an error unexpectedly. <strong>Trying again may fix the issue.</strong>"],
	[ ProjectionRequestError.SEND_ERROR,              "Failed to send projection update request. <strong>Are you connected to the internet?</strong>"],
]);

/**
 * Report and display an error to the user.
 * @param errorType - Type of error to report
 */
export function showError(errorType: SimError): void {
	const message = projectionErrorMessages.has(errorType) ? projectionErrorMessages.get(errorType) as string : "An unexpected error has occurred.<br/><b>" + errorType + "</b>";

	console.error(errorType + " : " + message);
	showAlert(message, AlertType.ERROR);
	return;
}

/**
 * Errors.ts : Error handling and display for the reconstruction module.
 * @author Iwan Mitchell
 */

import { AlertType, showAlert } from "../../../base/static/js/base";

// ====================================================== //
// ======================= Errors ======================= //
// ====================================================== //

/**
 * Errors regarding detector parameters
 * This is a string constructed by the validators
 */
export type ReconstructionConfigError = string

/**
 * Errors regarding transmission and communication with the API
 */
export enum ReconstructionRequestError {
	RESPONSE_DECODE = "Unable To Decode Detector Data",
	UNEXPECTED_SERVER_ERROR = "Server Errored Unexpectedly",
	UNSUPPORTED_PARAMETERS = "Unsupported Parameters",
	SEND_ERROR = "Sending Update Request Failed",
}

type ReconstructionError = ReconstructionRequestError | ReconstructionConfigError;

// ====================================================== //
// ======================= Display ====================== //
// ====================================================== //

const reconstructionErrorMessages = new Map<ReconstructionError, string>([
	[ ReconstructionRequestError.RESPONSE_DECODE,         "A malformed response was received from the server. <strong>Trying again may fix the issue.</strong>"],
	[ ReconstructionRequestError.UNEXPECTED_SERVER_ERROR, "The server returned an error unexpectedly. <strong>Trying again may fix the issue.</strong>"],
	[ ReconstructionRequestError.UNSUPPORTED_PARAMETERS,  "Unsupported parameters were declined by the server."],
	[ ReconstructionRequestError.SEND_ERROR,              "Failed to send detector update request. <strong>Are you connected to the internet?</strong>"],
]);

/**
 * Report and display an error to the user.
 * @param errorType - Type of error to report
 */
export function showError(errorType: ReconstructionError): void {
	const message = reconstructionErrorMessages.has(errorType) ? reconstructionErrorMessages.get(errorType) as string : errorType;

	console.error(errorType + " : " + message);
	showAlert(message, AlertType.ERROR);
	return;
}

export function showValidationError(message:ReconstructionConfigError):void {
	console.error("Validation Error: " + message)
	showAlert(message, AlertType.WARNING)
}

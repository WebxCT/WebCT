/**
 * Errors.ts : Error handling and display for the sample module.
 * @author Iwan Mitchell
 */

import { AlertType, showAlert } from "../../../base/static/js/base";

// ====================================================== //
// ======================= Errors ======================= //
// ====================================================== //

/**
 * Errors regarding beam parameters.
 * This is a string constructed by the validators
 */
export type SampleConfigError = string

/**
 * Errors regarding transmission and communication with the API
 */
export enum SampleRequestError {
	RESPONSE_DECODE = "Unable To Decode Detector Data",
	UNEXPECTED_SERVER_ERROR = "Server Errored Unexpectedly",
	UNSUPPORTED_PARAMETERS = "Unsupported Parameters",
	SEND_ERROR = "Sending Update Request Failed",
}

type SampleError = SampleRequestError | SampleConfigError;

// ====================================================== //
// ======================= Display ====================== //
// ====================================================== //

const beamErrorMessages = new Map<SampleError, string>([
	[ SampleRequestError.RESPONSE_DECODE,         "A malformed response was received from the server. <strong>Trying again may fix the issue.</strong>"],
	[ SampleRequestError.UNEXPECTED_SERVER_ERROR, "The server returned an error unexpectedly. <strong>Trying again may fix the issue.</strong>"],
	[ SampleRequestError.UNSUPPORTED_PARAMETERS,  "Unsupported parameters were declined by the server."],
	[ SampleRequestError.SEND_ERROR,              "Failed to send detector update request. <strong>Are you connected to the internet?</strong>"],
]);

/**
 * Report and display an error to the user.
 * @param errorType - Type of error to report
 */
export function showError(errorType: SampleError): void {
	const message = beamErrorMessages.has(errorType) ? beamErrorMessages.get(errorType) as string : errorType;

	console.error(errorType + " : " + message);
	showAlert(message, AlertType.ERROR);
	return;
}

export function showValidationError(message:SampleConfigError):void {
	console.error("Validation Error: " + message)
	showAlert(message, AlertType.WARNING)
}

/**
 * Errors.ts : Error handling and display for the capture module.
 * @author Iwan Mitchell
 */

import { AlertType, showAlert } from "../../../base/static/js/base";

// ====================================================== //
// ======================= Errors ======================= //
// ====================================================== //

/**
 * Errors regarding capture parameters
 */
export enum CaptureConfigError {
	PANE_UNSUPPORTED_WIDTH = "Unsupported Pane Width",
	PANE_UNSUPPORTED_HEIGHT = "Unsupported Pane Height",
	PANE_UNSUPPORTED_PIXEL_SIZE = "Unsupported Pixel Size",
}

/**
 * Errors regarding transmission and communication with the API
 */
export enum CaptureRequestError {
	RESPONSE_DECODE = "Unable To Decode Capture Data",
	UNEXPECTED_SERVER_ERROR = "Server Errored Unexpectedly",
	UNSUPPORTED_PARAMETERS = "Unsupported Parameters",
	SEND_ERROR = "Sending Update Request Failed",
}

type CaptureError = CaptureRequestError | CaptureConfigError;

// ====================================================== //
// ======================= Display ====================== //
// ====================================================== //

const beamErrorMessages = new Map<CaptureError, string>([
	[ CaptureRequestError.RESPONSE_DECODE,         "A malformed response was received from the server. <strong>Trying again may fix the issue.</strong>"],
	[ CaptureRequestError.UNEXPECTED_SERVER_ERROR, "The server returned an error unexpectedly. <strong>Trying again may fix the issue.</strong>"],
	[ CaptureRequestError.UNSUPPORTED_PARAMETERS,  "Unsupported parameters were declined by the server."],
	[ CaptureRequestError.SEND_ERROR,              "Failed to send capture update request. <strong>Are you connected to the internet?</strong>"],
]);

/**
 * Report and display an error to the user.
 * @param errorType - Type of error to report
 */
export function showError(errorType: CaptureError): void {
	const message = beamErrorMessages.has(errorType) ? beamErrorMessages.get(errorType) as string : "An unexpected error has occurred.<br><b>" + errorType + "</b>";

	console.error(errorType + " : " + message);
	showAlert(message, AlertType.ERROR);
	return;
}

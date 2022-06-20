/**
 * Errors.ts : Error handling and display for the detector module.
 * @author Iwan Mitchell
 */

import { AlertType, showAlert } from "../../../base/static/js/base";

// ====================================================== //
// ======================= Errors ======================= //
// ====================================================== //

/**
 * Errors regarding detector parameters
 */
export enum DetectorConfigError {
	PANE_UNSUPPORTED_WIDTH = "Unsupported Pane Width",
	PANE_UNSUPPORTED_HEIGHT = "Unsupported Pane Height",
	PANE_UNSUPPORTED_PIXEL_SIZE = "Unsupported Pixel Size",
}

/**
 * Errors regarding transmission and communication with the API
 */
export enum DetectorRequestError {
	RESPONSE_DECODE = "Unable To Decode Detector Data",
	UNEXPECTED_SERVER_ERROR = "Server Errored Unexpectedly",
	UNSUPPORTED_PARAMETERS = "Unsupported Parameters",
	SEND_ERROR = "Sending Update Request Failed",
}

type DetectorError = DetectorRequestError | DetectorConfigError;

// ====================================================== //
// ======================= Display ====================== //
// ====================================================== //

const beamErrorMessages = new Map<DetectorError, string>([
	[ DetectorConfigError.PANE_UNSUPPORTED_HEIGHT, "The detector does not support the provided height. <strong>Please enter a different pane height.</strong>"],
	[ DetectorConfigError.PANE_UNSUPPORTED_WIDTH, "The detector does not support the provided width. <strong>Please enter a different pane width.</strong>"],
	[ DetectorConfigError.PANE_UNSUPPORTED_PIXEL_SIZE, "The detector does not support the provided pixel size. <strong>Please enter a different pixel size.</strong>"],
	[ DetectorRequestError.RESPONSE_DECODE,         "A malformed response was received from the server. <strong>Trying again may fix the issue.</strong>"],
	[ DetectorRequestError.UNEXPECTED_SERVER_ERROR, "The server returned an error unexpectedly. <strong>Trying again may fix the issue.</strong>"],
	[ DetectorRequestError.UNSUPPORTED_PARAMETERS,  "Unsupported parameters were declined by the server."],
	[ DetectorRequestError.SEND_ERROR,              "Failed to send detector update request. <strong>Are you connected to the internet?</strong>"],
]);

/**
 * Report and display an error to the user.
 * @param errorType - Type of error to report
 */
export function showError(errorType: DetectorError): void {
	const message = beamErrorMessages.has(errorType) ? beamErrorMessages.get(errorType) as string : "An unexpected error has occurred.<br><b>" + errorType + "</b>";

	console.error(errorType + " : " + message);
	showAlert(message, AlertType.ERROR);
	return;
}

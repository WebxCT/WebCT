/**
 * Beam.ts : Functions relating to displaying and editing beam properties.
 * @author Iwan Mitchell
 */

import { SlInput } from "@shoelace-style/shoelace";
import { AlertType, showAlert } from "../../../base/static/js/base";
import { SetPreviewSize } from "../../../preview/static/js/sim/projection";
import { DetectorResponseRegistry, prepareRequest, processResponse, requestDetectorData, sendDetectorData } from "./api";
import { DetectorConfigError, DetectorRequestError, showError } from "./errors";
import { validateHeight, validatePixel, validateWidth } from "./validation";

// ====================================================== //
// ================== Document Elements ================= //
// ====================================================== //
export let PaneWidthElement: SlInput;
let PaneHeightElement: SlInput;
export let PanePixelSizeElement: SlInput;
let DetectorPreviewElement: HTMLDivElement;
let DetectorHorizontalText: SVGTextElement;
let DetectorVerticalText: SVGTextElement;

// ====================================================== //
// ======================= Globals ====================== //
// ====================================================== //

// ====================================================== //
// ======================== Setup ======================= //
// ====================================================== //

/**
 * Setup Beam component for use, including element discovery, and initial state
 * api requests.
 */
export function setupDetector(): boolean {
	console.log("setupDetector");

	const pane_width_element = document.getElementById("inputPaneWidth");
	const pane_height_element = document.getElementById("inputPaneHeight");
	const pane_pixel_size_element = document.getElementById("inputPanePixelSize");
	const detector_preview_element = document.getElementById("divDetectorPreview");
	const text_detector_horizontal = document.getElementById("textDetectorHorizontal");
	const text_detector_vertical = document.getElementById("textDetectorVertical");


	if (pane_width_element == null ||
		pane_height_element == null ||
		pane_pixel_size_element == null ||
		detector_preview_element == null ||
		text_detector_horizontal == null ||
		text_detector_vertical == null) {
		console.log(pane_width_element);
		console.log(pane_height_element);
		console.log(pane_pixel_size_element);
		console.log(detector_preview_element);
		console.log(text_detector_horizontal);
		console.log(text_detector_vertical);

		showAlert("Detector setup failure", AlertType.ERROR);
		return false;
	}

	PaneWidthElement = pane_width_element as SlInput;
	PaneWidthElement.addEventListener("sl-change", () => {
		validateWidth(PaneWidthElement);
		previewDetector();
	});
	PaneHeightElement = pane_height_element as SlInput;
	PaneHeightElement.addEventListener("sl-change", () => {
		validateHeight(PaneHeightElement);
		previewDetector();
	});
	PanePixelSizeElement = pane_pixel_size_element as SlInput;
	PanePixelSizeElement.addEventListener("sl-change", () => {
		validatePixel(PanePixelSizeElement);
		previewDetector();
	});
	DetectorPreviewElement = detector_preview_element as HTMLDivElement;

	DetectorHorizontalText = text_detector_horizontal as unknown as SVGTextElement;
	DetectorVerticalText = text_detector_vertical as unknown as SVGTextElement;


	previewDetector();
	return true;
}

/**
 * Validate detector parameters and mark as valid/invalid.
 */
export function validateDetector(): boolean {
	return validateWidth(PaneWidthElement)
		&& validateHeight(PaneHeightElement)
		&& validatePixel(PanePixelSizeElement);
}

// ====================================================== //
// =================== Display and UI =================== //
// ====================================================== //

function previewDetector(): void {
	if (!validateDetector()) {
		return;
	}

	const pixSize = parseFloat(PanePixelSizeElement.value) / 1000;
	const height = Math.round(parseFloat(PaneHeightElement.value) / pixSize);
	const width = Math.round(parseFloat(PaneWidthElement.value) / pixSize);
	SetPreviewSize(height, width);

	// Update detector square
	DetectorPreviewElement.style.width = width + "px";
	DetectorPreviewElement.style.height = height + "px";
	// DetectorPreviewElement.textContent = width + "x" + height + " px"
	DetectorHorizontalText.textContent = PaneWidthElement.value + "mm (" + width + "px)";
	DetectorVerticalText.textContent = PaneHeightElement.value + "mm (" + height + "px)";

}

// ====================================================== //
// ==================== Page Updates ==================== //
// ====================================================== //

/**
 * Send current detector settings to the server, then request new detector properties.
 */
export function SyncDetector(): Promise<void> {
	return setDetector().then(() => {
		UpdateDetector();
	});
}

/**
 * Request detector data from the server.
 */
export function UpdateDetector(): Promise<void> {

	return requestDetectorData().then((response: Response) => {
		console.log("Detector Data Response Status:" + response.status);
		if (response.status == 400) {
			showError(DetectorRequestError.UNSUPPORTED_PARAMETERS);
			return;
		} else if (response.status == 500) {
			showError(DetectorRequestError.UNEXPECTED_SERVER_ERROR);
			return;
		}

		// Convert to json
		const result = response.json();

		result.then((result: unknown) => {

			const properties = processResponse(result as DetectorResponseRegistry["detectorResponse"]);

			// update local values
			// no implicit cast from number to string, really js?
			PaneHeightElement.value = properties.paneHeight + "";
			PaneWidthElement.value = properties.paneWidth + "";
			PanePixelSizeElement.value = properties.pixelSize * 1000 + "";

			previewDetector();
		}).catch(() => {
			showError(DetectorRequestError.RESPONSE_DECODE);
		});
	}).catch(() => {
		showError(DetectorRequestError.SEND_ERROR);
	});
}

/**
 * Send detector parameters to the server.
 */
function setDetector(): Promise<void> {

	if (!validateDetector()) {
		throw DetectorConfigError;
	}

	const detector = prepareRequest({
		paneHeight: parseFloat(PaneHeightElement.value),
		paneWidth: parseFloat(PaneWidthElement.value),
		pixelSize: parseFloat(PanePixelSizeElement.value) / 1000,
	});

	return sendDetectorData(detector).then((response: Response) => {
		if (response.status == 200) {
			console.log("Detector updated");
		} else if (response.status == 400) {
			showError(DetectorRequestError.UNSUPPORTED_PARAMETERS);
		} else {
			showError(DetectorRequestError.UNEXPECTED_SERVER_ERROR);
		}
	}).catch(() => {
		showError(DetectorRequestError.SEND_ERROR);
	});
}

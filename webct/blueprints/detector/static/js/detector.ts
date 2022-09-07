/**
 * Beam.ts : Functions relating to displaying and editing beam properties.
 * @author Iwan Mitchell
 */

import { SlButton, SlDialog, SlInput } from "@shoelace-style/shoelace";
import { AlertType, showAlert } from "../../../base/static/js/base";
import { SetPreviewSize } from "../../../preview/static/js/sim/projection";
import { DetectorResponseRegistry, prepareRequest, processResponse, requestDetectorData, sendDetectorData } from "./api";
import { DetectorConfigError, DetectorRequestError, showError } from "./errors";
import { DetectorProperties, LSF, LSFDisplay, LSFParseEnum } from "./types";
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

let LSFDialogButton: SlButton;
let LSFDialogClose: SlButton;
let LSFDialogInput: SlInput;
let LSFDialogSubmit: SlButton;
let LSFDialog:SlDialog;
let LSFCanvas: HTMLCanvasElement;
let LSFDialogCanvas: HTMLCanvasElement;

// ====================================================== //
// ======================= Globals ====================== //
// ====================================================== //

let CurrentLSF: LSF;
let NewLSF: LSF;

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

	const dialog_lsf = document.getElementById("dialogueLSF");
	const button_show_lsf = document.getElementById("buttonShowLSF");
	const input_lsf = document.getElementById("inputLSF");
	const button_lsf_submit = document.getElementById("buttonLSFSubmit");
	const button_lsf_close = document.getElementById("buttonLSFClose");
	const canvas_lsf = document.getElementById("canvasLSF");
	const canvas_lsf_dialog = document.getElementById("canvasLSFDialog");

	if (pane_width_element == null ||
		pane_height_element == null ||
		pane_pixel_size_element == null ||
		detector_preview_element == null ||
		text_detector_horizontal == null ||
		text_detector_vertical == null ||

		dialog_lsf == null ||
		button_show_lsf == null ||
		input_lsf == null ||
		button_lsf_submit == null ||
		button_lsf_close == null ||
		canvas_lsf == null ||
		canvas_lsf_dialog == null) {

		console.log(pane_width_element);
		console.log(pane_height_element);
		console.log(pane_pixel_size_element);
		console.log(detector_preview_element);
		console.log(text_detector_horizontal);
		console.log(text_detector_vertical);

		console.log(dialog_lsf);
		console.log(button_show_lsf);
		console.log(input_lsf);
		console.log(button_lsf_submit);
		console.log(button_lsf_close);
		console.log(canvas_lsf);
		console.log(canvas_lsf_dialog);


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

	LSFDialog = dialog_lsf as SlDialog;
	LSFDialogButton = button_show_lsf as SlButton;
	LSFDialogInput = input_lsf as SlInput;
	LSFDialogClose = button_lsf_close as SlButton;
	LSFDialogSubmit = button_lsf_submit as SlButton;
	LSFCanvas = canvas_lsf as HTMLCanvasElement;
	LSFDialogCanvas = canvas_lsf_dialog as HTMLCanvasElement;

	LSFDialogButton.onclick = () => {
		LSFDialog.show();
	};

	LSFDialogClose.onclick = () => {
		LSFDialog.hide();
	};

	LSFDialogSubmit.onclick = () => {
		const parseResult = LSF.from_text(LSFDialogInput.value);
		if (parseResult.status !== LSFParseEnum.SUCCESS) {
			// Button should've been disabled by other validation methods, but
			// wasn't done in time. Pre-emptively disable the submit button and
			// then do nothing.
			LSFDialogSubmit.disabled = true;
			return;
		}

		// Submitted a new LSF!
		CurrentLSF = NewLSF;
		previewDetector();
		LSFDialog.hide();
	};

	LSFDialogInput.addEventListener("sl-change", () => {
		const parseResult = LSF.from_text(LSFDialogInput.value);
		console.log(parseResult);

		if (parseResult.status == LSFParseEnum.SUCCESS && parseResult.lsf !== undefined) {
			// Save to new LSF
			NewLSF = parseResult.lsf;
			LSFDialogSubmit.disabled = false;
		} else {
			LSFDialogSubmit.disabled = true;
		}

		// Update dialog LSF Canvas
		new LSFDisplay(NewLSF, LSFDialogCanvas).displayLSF();

	});

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

function updateDialog(): void {
	return;
}

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

	// Update LSF Graph
	console.log("preview detector");
	if (CurrentLSF != undefined ) {
		const lsfdisp = new LSFDisplay(CurrentLSF, LSFCanvas);
		lsfdisp.displayLSF();
	}

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
			setDetectorParams(properties);

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

	const detector = prepareRequest(getDetectorParams());

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

function setDetectorParams(properties:DetectorProperties) {
	// update local values
	// no implicit cast from number to string, really js?
	PaneHeightElement.value = properties.paneHeight + "";
	PaneWidthElement.value = properties.paneWidth + "";
	PanePixelSizeElement.value = properties.pixelSize * 1000 + "";

	// Update LSF
	CurrentLSF = properties.lsf;
	LSFDialogInput.value = CurrentLSF.values.join(", ");
	new LSFDisplay(CurrentLSF, LSFDialogCanvas).displayLSF();

	previewDetector();
}

export function getDetectorParams():DetectorProperties {
	return {
		paneHeight: parseFloat(PaneHeightElement.value),
		paneWidth: parseFloat(PaneWidthElement.value),
		pixelSize: parseFloat(PanePixelSizeElement.value) / 1000,
		lsf: CurrentLSF
	};
}

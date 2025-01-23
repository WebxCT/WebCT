/**
 * Beam.ts : Functions relating to displaying and editing beam properties.
 * @author Iwan Mitchell
 */

import { SlButton, SlDropdown, SlInput, SlRange, SlSelect } from "@shoelace-style/shoelace";
import { AlertType, showAlert } from "../../../base/static/js/base";
import { PanePixelSizeElement, PaneWidthElement } from "../../../detector/static/js/detector";
import { CaptureResponseRegistry, processResponse, requestCaptureData, sendCaptureData, prepareRequest, requestCapturePreview } from "./api";
import { CaptureConfigError, CaptureRequestError, showError } from "./errors";
import { CapturePreview, CaptureProperties } from "./types";
import { validateProjections } from "./validation";
import { UpdatePage } from "../../../app/static/js/app";

// ====================================================== //
// ================== Document Elements ================= //
// ====================================================== //
let TotalRotationElement: SlSelect;
let TotalProjectionsElement: SlInput;
let BeamPosXElement: SlInput;
let BeamPosYElement: SlInput;
let BeamPosZElement: SlInput;
let DetectorPosXElement: SlInput;
let DetectorPosYElement: SlInput;
let DetectorPosZElement: SlInput;

let SamplePosElement: SlRange;
let SampleSDDElement: HTMLParagraphElement;
let SampleSODElement: HTMLParagraphElement;
let SampleODDElement: HTMLParagraphElement;
let SampleRotateXElement: SlInput;
let SampleRotateYElement: SlInput;
let SampleRotateZElement: SlInput;
let ButtonRotateClock45Element: SlButton;
let ButtonRotateCounterClock45Element: SlButton;

let PreviewImages: NodeListOf<HTMLImageElement>;
let PreviewOverlays: NodeListOf<HTMLDivElement>;

let NyquistRange: SlRange;

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
export function setupCapture(): boolean {
	console.log("setupCapture");

	PreviewImages = document.querySelectorAll("video.image-capture") as NodeListOf<HTMLImageElement>;
	PreviewOverlays = document.querySelectorAll(".overlay-capture") as NodeListOf<HTMLDivElement>;

	const total_rotation_element = document.getElementById("selectCaptureRotation");
	const total_projections_element = document.getElementById("inputCaptureProjections");

	const beam_posx_element = document.getElementById("inputBeamPosX");
	const beam_posy_element = document.getElementById("inputBeamPosY");
	const beam_posz_element = document.getElementById("inputBeamPosZ");

	const detector_posx_element = document.getElementById("inputDetectorPosX");
	const detector_posy_element = document.getElementById("inputDetectorPosY");
	const detector_posz_element = document.getElementById("inputDetectorPosZ");

	const sample_position_element = document.getElementById("rangeSamplePosition");
	const sample_position_sdd = document.getElementById("textSDD")
	const sample_position_sod = document.getElementById("textSOD")
	const sample_position_odd = document.getElementById("textODD")

	const sample_rotatex_element = document.getElementById("inputSampleRotateX");
	const sample_rotatey_element = document.getElementById("inputSampleRotateY");
	const sample_rotatez_element = document.getElementById("inputSampleRotateZ");

	const sample_rotate_counter_clock_45_element = document.getElementById("buttonSampleRotateCounterClock45");
	const sample_rotate_clock_45_element = document.getElementById("buttonSampleRotateClock45");

	const range_nyquist = document.getElementById("rangeNyquist");

	if (total_rotation_element == null ||
		total_projections_element == null ||
		beam_posx_element == null ||
		beam_posy_element == null ||
		beam_posz_element == null ||
		sample_position_element == null ||
		sample_position_sdd == null ||
		sample_position_sod == null ||
		sample_position_odd == null ||
		sample_rotatex_element == null ||
		sample_rotatey_element == null ||
		sample_rotatez_element == null ||
		sample_rotate_counter_clock_45_element == null ||
		sample_rotate_clock_45_element == null ||
		detector_posx_element == null ||
		detector_posy_element == null ||
		detector_posz_element == null ||
		range_nyquist == null) {

		console.log(total_rotation_element);
		console.log(total_projections_element);

		console.log(beam_posx_element);
		console.log(beam_posy_element);
		console.log(beam_posz_element);

		console.log(detector_posx_element);
		console.log(detector_posy_element);
		console.log(detector_posz_element);

		console.log(sample_position_element);
		console.log(sample_position_sdd);
		console.log(sample_position_sod);
		console.log(sample_position_odd);
		console.log(sample_rotatex_element);
		console.log(sample_rotatey_element);
		console.log(sample_rotatez_element);

		console.log(sample_rotate_clock_45_element);
		console.log(sample_rotate_counter_clock_45_element);
		console.log(range_nyquist);

		showAlert("Capture setup failure", AlertType.ERROR);
		return false;
	}

	TotalRotationElement = total_rotation_element as SlSelect;
	TotalProjectionsElement = total_projections_element as SlInput;
	TotalProjectionsElement.addEventListener("sl-change", () => {
		validateProjections(TotalProjectionsElement);
	});

	BeamPosXElement = beam_posx_element as SlInput;
	BeamPosYElement = beam_posy_element as SlInput;
	BeamPosZElement = beam_posz_element as SlInput;
	DetectorPosXElement = detector_posx_element as SlInput;
	DetectorPosYElement = detector_posy_element as SlInput;
	DetectorPosZElement = detector_posz_element as SlInput;

	SamplePosElement = sample_position_element as SlRange;
	SampleSDDElement = sample_position_sdd as HTMLParagraphElement;
	SampleSODElement = sample_position_sod as HTMLParagraphElement;
	SampleODDElement = sample_position_odd as HTMLParagraphElement;
	SampleRotateXElement = sample_rotatex_element as SlInput;
	SampleRotateYElement = sample_rotatey_element as SlInput;
	SampleRotateZElement = sample_rotatez_element as SlInput;
	ButtonRotateClock45Element = sample_rotate_clock_45_element as SlButton;
	ButtonRotateCounterClock45Element = sample_rotate_counter_clock_45_element as SlButton;

	// Workaround hack to deal with styling annoying shadowroot classes
	Array.prototype.slice.call(document.getElementsByTagName("sl-dropdown")).forEach((dropdown: SlDropdown) => {
		Array.prototype.slice.call(dropdown.shadowRoot?.children).forEach((child: HTMLElement) => {
			if (child.tagName == "DIV") {
				Array.prototype.slice.call(child.children).forEach((child2: HTMLElement) => {
					if (child2.classList.contains("dropdown__positioner")) {
						child2.style.width = "100%";
					}
				});
			}
		});
	});

	SamplePosElement.addEventListener("sl-change", () => {
		let [sod, odd, sdd] = updateSamplePositionBar();

		BeamPosYElement.value = (sod * -1).toFixed(2)
		DetectorPosYElement.value = odd.toFixed(2)
	});

	BeamPosYElement.addEventListener("sl-change", () => {
		let sod = parseFloat(BeamPosYElement.value) * -1
		let odd = parseFloat(DetectorPosYElement.value)
		let sdd = sod + odd
		SamplePosElement.value = (sod / sdd) * 100
		updateSamplePositionBar();
	});
	DetectorPosYElement.addEventListener("sl-change", () => {
		let sod = parseFloat(BeamPosYElement.value) * -1
		let odd = parseFloat(DetectorPosYElement.value)
		let sdd = sod + odd
		SamplePosElement.value = (sod / sdd) * 100
		updateSamplePositionBar();
	});

	NyquistRange = range_nyquist as SlRange;
	NyquistRange.addEventListener("sl-change", () => {
		TotalProjectionsElement.value = Math.floor((Math.PI / 2.0 * (parseInt(PaneWidthElement.value) / (parseFloat(PanePixelSizeElement.value) / 1000))) * (NyquistRange.value as number / 100)) + "";
		NyquistRange.classList.add("linked");
	});
	NyquistRange.tooltipFormatter = (value: number) => {
		return value.toFixed(0) + "%";
	};
	TotalProjectionsElement.addEventListener("sl-change", () => {
		NyquistRange.classList.remove("linked");
	});

	for (let index = 0; index < PreviewImages.length; index++) {
		const image = PreviewImages[index];
		window.addEventListener("invertOn", () => {
			image.classList.add("invert");
		});
		window.addEventListener("invertOff", () => {
			image.classList.remove("invert");
		});
	}

	ButtonRotateClock45Element.onclick = () => {
		SampleRotateZElement.value = (parseFloat(SampleRotateZElement.value) + 45) % 360 + "";
		UpdatePage();
	};
	ButtonRotateCounterClock45Element.onclick = () => {
		let rot = (parseFloat(SampleRotateZElement.value) - 45)
		if (rot < 0) { rot += 360 }
		SampleRotateZElement.value = rot + "";
		UpdatePage();
	};

	validateCapture();
	SetOverlaySize(300, 300);
	return true;
}

/**
 * Validate capture parameters and mark as valid/invalid.
 */
export function validateCapture(): boolean {
	return validateProjections(TotalProjectionsElement);
}

// ====================================================== //
// =================== Display and UI =================== //
// ====================================================== //

function updateSamplePositionBar():[number, number, number] {
	// Assuming sample position only moves in the Y-coordinate, not taking into account axis offsets.
	let sod = parseFloat(BeamPosYElement.value) * -1
	let odd = parseFloat(DetectorPosYElement.value)
	let sdd = sod + odd

	sod = sdd * (SamplePosElement.value / 100)
	odd = sdd - sod
	SampleODDElement.textContent = odd.toFixed(2) + "mm"
	SampleSODElement.textContent = sod.toFixed(2) + "mm"
	SampleSDDElement.textContent = sdd.toFixed(2) + "mm"
	return [sod, odd, sdd]
}

function SetOverlaySize(width: number, height: number): void {
	for (let index = 0; index < PreviewOverlays.length; index++) {
		const overlay = PreviewOverlays[index];
		overlay.style.height = height + "px";
		overlay.style.width = width + "px";
	}
}

function MarkLoading(): void {
	console.log("markloading");

	for (let index = 0; index < PreviewImages.length; index++) {
		const image = PreviewImages[index];
		image.classList.add("updating");
		image.classList.remove("error");
	}

	for (let index = 0; index < PreviewOverlays.length; index++) {
		const overlay = PreviewOverlays[index];
		overlay.classList.add("updating");
		overlay.classList.add("update");
	}
}

function MarkDone(): void {
	console.log("markdone");

	for (let index = 0; index < PreviewImages.length; index++) {
		const image = PreviewImages[index];
		image.classList.remove("updating");
		image.classList.remove("error");
	}

	for (let index = 0; index < PreviewOverlays.length; index++) {
		const overlay = PreviewOverlays[index];
		overlay.classList.remove("update");
		overlay.classList.remove("updating");
	}
}

function MarkNeedsUpdate(): void {
	console.log("markneedsupdate");

	for (let index = 0; index < PreviewImages.length; index++) {
		const image = PreviewImages[index];
		image.classList.remove("updating");
		image.classList.remove("error");
	}

	for (let index = 0; index < PreviewOverlays.length; index++) {
		const overlay = PreviewOverlays[index];
		overlay.classList.add("update");
		overlay.classList.remove("updating");
	}
}

function MarkError(): void {
	console.log("markerror");

	for (let index = 0; index < PreviewImages.length; index++) {
		const image = PreviewImages[index];
		image.classList.add("error");
		image.classList.remove("updating");
	}

	for (let index = 0; index < PreviewOverlays.length; index++) {
		const overlay = PreviewOverlays[index];
		overlay.classList.add("update");
		overlay.classList.remove("updating");
	}
}

function SetPreviewImage(imagestr: string, width: number, height: number): void {
	for (let index = 0; index < PreviewImages.length; index++) {
		const image = PreviewImages[index];
		image.width = width;
		image.height = height;
		image.src = "data:video/mp4;base64," + imagestr;
	}
}

// ====================================================== //
// ==================== Page Updates ==================== //
// ====================================================== //

/**
 * Send current capture settings to the server, then request new capture properties.
 */
export function SyncCapture(): Promise<void> {
	return setCapture().then(() => {
		UpdateCapture();
	});
}

/**
 * Request capture data from the server.
 */
export function UpdateCapture(): Promise<void> {

	MarkNeedsUpdate();
	return requestCaptureData().then((response: Response) => {
		console.log("Capture Data Response Status:" + response.status);
		if (response.status == 400) {
			showError(CaptureRequestError.UNSUPPORTED_PARAMETERS);
			return;
		} else if (response.status == 500) {
			showError(CaptureRequestError.UNEXPECTED_SERVER_ERROR);
			return;
		}

		// Convert to json
		const result = response.json();

		result.then((result: unknown) => {

			const properties = processResponse(result as CaptureResponseRegistry["captureResponse"], "captureResponse") as CaptureProperties;
			setCaptureParams(properties);

		}).catch(() => {
			showError(CaptureRequestError.RESPONSE_DECODE);
		});
	}).catch(() => {
		showError(CaptureRequestError.SEND_ERROR);
	});
}

/**
 * Send capture parameters to the server.
 */
function setCapture(): Promise<void> {

	if (!validateCapture()) {
		throw CaptureConfigError;
	}

	const capture = prepareRequest(getCaptureParams());

	return sendCaptureData(capture).then((response: Response) => {
		if (response.status == 200) {
			console.log("Capture updated");
		} else if (response.status == 400) {
			showError(CaptureRequestError.UNSUPPORTED_PARAMETERS);
		} else {
			showError(CaptureRequestError.UNEXPECTED_SERVER_ERROR);
		}
	}).catch(() => {
		showError(CaptureRequestError.SEND_ERROR);
	});
}

export function UpdateCapturePreview(): Promise<void> {
	return UpdateCapture().then(() => {
		MarkLoading();

		requestCapturePreview().then((response: Response) => {
			console.log("Capture Preview Response Status:" + response.status);
			if (response.status == 500) {
				showError(CaptureRequestError.UNEXPECTED_SERVER_ERROR);
				return;
			}

			// Convert to json
			const result = response.json();

			result.then((result: unknown) => {
				const preview = processResponse(result as CaptureResponseRegistry["captureResponse"], "capturePreviewResponse") as CapturePreview;
				window.dispatchEvent(new CustomEvent("stopLoadingCapture", {
					bubbles: true,
					cancelable: false,
					composed: false,
				}));

				SetOverlaySize(preview.width, preview.height);
				SetPreviewImage(preview.gifString, preview.width, preview.height);
				MarkDone();
			}).catch(() => {
				showError(CaptureRequestError.RESPONSE_DECODE);
				MarkError();
			});
		}).catch(() => {
			showError(CaptureRequestError.SEND_ERROR);
			MarkError();
		});
	}).catch(() => { MarkError(); });
}

export function getCaptureParams():CaptureProperties {
	return {
		numProjections: parseInt(TotalProjectionsElement.value),
		totalAngle: parseInt(TotalRotationElement.value as string) as 180 | 360,
		beamPosition: [parseFloat(BeamPosXElement.value), parseFloat(BeamPosYElement.value), parseFloat(BeamPosZElement.value)],
		detectorPosition: [parseFloat(DetectorPosXElement.value), parseFloat(DetectorPosYElement.value), parseFloat(DetectorPosZElement.value)],
		sampleRotation: [parseFloat(SampleRotateXElement.value), parseFloat(SampleRotateYElement.value), parseFloat(SampleRotateZElement.value)],
	};
}

export function setCaptureParams(properties:CaptureProperties) {
	// update local values
	// no implicit cast from number to string, really js?
	TotalProjectionsElement.value = properties.numProjections + "";
	TotalRotationElement.value = properties.totalAngle + "";

	BeamPosXElement.value = properties.beamPosition[0] + "";
	BeamPosYElement.value = properties.beamPosition[1] + "";
	BeamPosZElement.value = properties.beamPosition[2] + "";

	DetectorPosXElement.value = properties.detectorPosition[0] + "";
	DetectorPosYElement.value = properties.detectorPosition[1] + "";
	DetectorPosZElement.value = properties.detectorPosition[2] + "";

	SampleRotateXElement.value = properties.sampleRotation[0] + "";
	SampleRotateYElement.value = properties.sampleRotation[1] + "";
	SampleRotateZElement.value = properties.sampleRotation[2] + "";

	let pct = ((properties.beamPosition[1] * -1) / ((properties.beamPosition[1]* -1) + properties.detectorPosition[1])) * 100
	console.log(properties);
	console.log(pct);
	SamplePosElement.value = pct
	updateSamplePositionBar();
}

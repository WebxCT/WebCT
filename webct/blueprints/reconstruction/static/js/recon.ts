/**
 * Beam.ts : Functions relating to displaying and editing beam properties.
 * @author Iwan Mitchell
 */

import { SlInput, SlSelect } from "@shoelace-style/shoelace";
import { AlertType, showAlert } from "../../../base/static/js/base";
import { prepareRequest, processResponse, ReconResponseRegistry, requestReconData, requestReconPreview, sendReconData } from "./api";
import { CGLSParams, FBPParams, FDKParams, ReconQuality, ReconstructionParams, ReconstructionPreview, TikhonovMethod as TikhonovMethod, TikhonovRegulariser } from "./types";
import { BeamTypeElement } from "../../../beam/static/js/beam";
import { validateMethod } from "./validation";

// ====================================================== //
// ================== Document Elements ================= //
// ====================================================== //

export let AlgElement: SlSelect;
let AlgGroup: HTMLDivElement;
let QualityElement: SlSelect;
let QualityDescription: HTMLParagraphElement;

// FDK
let FDKSettings: HTMLDivElement;
let FDKFilter: SlSelect;

// FBK
let FBPSettings: HTMLDivElement;
let FBPFilter: SlSelect;

// CGLS
let CGLSSettings: HTMLDivElement;
let IterCGLSElement: SlInput;
let ToleranceCGLSElement: SlInput;

// Tikhonov
let TikSettings: HTMLDivElement;
let TikOpElement: SlSelect;
let TikAlphaElement: SlInput;
let TikBoundElement: SlSelect;

let SliceImages: NodeListOf<HTMLVideoElement>;
let SinogramImages: NodeListOf<HTMLVideoElement>;
let ReconImages: NodeListOf<HTMLVideoElement>;

let SliceOverlays: HTMLDivElement[];
let ReconOverlays: HTMLDivElement[];
let SinogramOverlays: HTMLDivElement[];
let Overlays: HTMLDivElement[];

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
export function setupRecon(): boolean {
	console.log("setupRecon");

	SliceImages = document.querySelectorAll("video.image-slice") as NodeListOf<HTMLVideoElement>;
	SinogramImages = document.querySelectorAll("video.image-sinogram") as NodeListOf<HTMLVideoElement>;
	ReconImages = document.querySelectorAll("video.image-recon") as NodeListOf<HTMLVideoElement>;

	// Convert to arrays for later concat
	SinogramOverlays = Array.prototype.slice.call(document.querySelectorAll(".overlay-sinogram") as NodeListOf<HTMLDivElement>);
	ReconOverlays = Array.prototype.slice.call(document.querySelectorAll(".overlay-recon") as NodeListOf<HTMLDivElement>);
	SliceOverlays = Array.prototype.slice.call(document.querySelectorAll(".overlay-slice") as NodeListOf<HTMLDivElement>);

	Overlays = SinogramOverlays
		.concat(ReconOverlays)
		.concat(SliceOverlays);

	const select_alg = document.getElementById("selectReconstruction");
	const group_alg = document.getElementById("groupAlg");
	const quality = document.getElementById("selectReconQuality");
	const quality_text = document.getElementById("descriptionQuality");

	// FDK
	const fdk_settings = document.getElementById("settingsFDK");
	const fdk_select_filter = document.getElementById("selectFDKFilter");

	// FBP
	const fbp_settings = document.getElementById("settingsFBP");
	const fbp_select_filter = document.getElementById("selectFBPFilter");

	// CGLS
	const cgls_settings = document.getElementById("settingsCGLS");
	const cgls_input_iterations = document.getElementById("inputCGLSIterations");
	const cgls_input_tolerance = document.getElementById("inputCGLSTolerance");

	// Tikhonov
	const tik_settings = document.getElementById("settingsTikhonov");
	const tik_select_operator = document.getElementById("selectTikOperator");
	const tik_input_alpha = document.getElementById("inputTikAlpha");
	const tik_select_boundary = document.getElementById("selectTikBoundary");

	if (select_alg == null ||
		group_alg == null ||
		quality == null ||
		quality_text == null ||
		fdk_select_filter == null ||
		fdk_settings == null ||
		fbp_settings == null ||
		fbp_select_filter == null ||
		cgls_settings == null ||
		cgls_input_iterations == null ||
		cgls_input_tolerance == null ||
		tik_settings == null ||
		tik_select_operator == null ||
		tik_input_alpha == null ||
		tik_select_boundary == null) {

		console.log(select_alg);
		console.log(group_alg);

		console.log(fdk_settings);
		console.log(fdk_select_filter);

		console.log(fbp_settings);
		console.log(fbp_select_filter);

		console.log(cgls_settings);
		console.log(cgls_input_iterations);
		console.log(cgls_input_tolerance);

		console.log(tik_settings);
		console.log(tik_select_operator);
		console.log(tik_input_alpha);
		console.log(tik_select_boundary);

		showAlert("Reconstruction setup failure", AlertType.ERROR);
		return false;
	}

	AlgElement = select_alg as SlSelect;
	AlgGroup = group_alg as HTMLDivElement;
	QualityDescription = quality_text as HTMLParagraphElement;
	QualityElement = quality as SlSelect;

	// FDK
	FDKFilter = fdk_select_filter as SlSelect;
	FDKSettings = fdk_settings as HTMLDivElement;

	// FBK
	FBPFilter = fbp_select_filter as SlSelect;
	FBPSettings = fbp_settings as HTMLDivElement;

	// CGLS
	CGLSSettings = cgls_settings as HTMLDivElement;
	IterCGLSElement = cgls_input_iterations as SlInput;
	ToleranceCGLSElement = cgls_input_tolerance as SlInput;

	// Tikhonov
	TikSettings = tik_settings as HTMLDivElement;
	TikAlphaElement = tik_input_alpha as SlInput;
	TikBoundElement = tik_select_boundary as SlSelect;
	TikOpElement = tik_select_operator as SlSelect;

	TikOpElement.addEventListener("sl-change", () => {
		switch ((TikOpElement.value as string) as TikhonovMethod) {
		case "projection":
		default:
			TikAlphaElement.disabled = true;
			TikBoundElement.disabled = true;
			break;
		case "identity":
			TikAlphaElement.disabled = false;
			TikBoundElement.disabled = true;
			break;
		case "gradient":
			TikAlphaElement.disabled = false;
			TikBoundElement.disabled = false;
			break;
		}
	});

	QualityElement.addEventListener("sl-change", () => {
		switch (parseInt(QualityElement.value as string) as ReconQuality) {
		case 0:
			QualityDescription.innerHTML = "High quality is a pixel-perfect simulation, including full detector size, and a reconstruction space matching the projection size.<br/> <sl-tag pill size='small' variant='danger'>Heavily uses GPU memory</sl-tag>";
			break;
		default:
		case 1:
			QualityDescription.textContent = "Medium quality uses a full detector size for projections, but a reduced size for the reconstruction space.";
			break;
		case 2:
			QualityDescription.textContent = "Low quality uses a half detector size for projections, and an even more reduced reconstruction space compared to medium quality.";
			break;
		case 3:
			QualityDescription.textContent = "Preview uses a fixed detector size of no more than 100 pixels in all axis, and will keep aspect ratio if one axis exceeds this limit. The reconstruction space is a fixed 100x100x100 cube.";
			break;
		}
	});

	AlgElement.addEventListener("sl-change", () => {
		// Set group type
		AlgGroup.setAttribute("type", AlgElement.value + "");
		validateRecon();

		// Hide all settings menus
		FDKSettings.classList.add("hidden");
		FBPSettings.classList.add("hidden");
		CGLSSettings.classList.add("hidden");
		TikSettings.classList.add("hidden");

		// Unhide specific alg settings
		switch (AlgElement.value) {
		case "FDK":
			FDKSettings.classList.remove("hidden");
			break;
		case "FBP":
			FBPSettings.classList.remove("hidden");
			break;
		case "CGLS":
			CGLSSettings.classList.remove("hidden");
			TikSettings.classList.remove("hidden");
			break;
		default:
			break;
		}
	});

	BeamTypeElement.addEventListener("sl-change", () => {
		validateRecon();
	});

	validateRecon();
	return true;
}

export function validateRecon(): boolean {
	return validateMethod(AlgElement);
}

// ====================================================== //
// =================== Display and UI =================== //
// ====================================================== //

function MarkLoading(): void {
	console.log("markloading");

	for (let index = 0; index < ReconImages.length; index++) {
		const image = ReconImages[index];
		image.classList.add("updating");
		image.classList.remove("error");
	}

	for (let index = 0; index < SinogramImages.length; index++) {
		const image = SinogramImages[index];
		image.classList.add("updating");
		image.classList.remove("error");
	}

	for (let index = 0; index < SliceImages.length; index++) {
		const image = SliceImages[index];
		image.classList.add("updating");
		image.classList.remove("error");
	}

	for (let index = 0; index < Overlays.length; index++) {
		const overlay = Overlays[index];
		overlay.classList.add("updating");
		overlay.classList.add("update");
	}
}

function MarkDone(): void {
	console.log("markdone");

	for (let index = 0; index < ReconImages.length; index++) {
		const image = ReconImages[index];
		image.classList.remove("updating");
		image.classList.remove("error");
	}

	for (let index = 0; index < SliceImages.length; index++) {
		const image = SliceImages[index];
		image.classList.remove("updating");
		image.classList.remove("error");
	}

	for (let index = 0; index < SinogramImages.length; index++) {
		const image = SinogramImages[index];
		image.classList.remove("updating");
		image.classList.remove("error");
	}

	for (let index = 0; index < Overlays.length; index++) {
		const overlay = Overlays[index];
		overlay.classList.remove("update");
		overlay.classList.remove("updating");
	}
}

function MarkNeedsUpdate(): void {
	console.log("markneedsupdate");

	for (let index = 0; index < ReconImages.length; index++) {
		const image = ReconImages[index];
		image.classList.add("updating");
		image.classList.remove("error");
	}

	for (let index = 0; index < SliceImages.length; index++) {
		const image = SliceImages[index];
		image.classList.add("updating");
		image.classList.remove("error");
	}

	for (let index = 0; index < SinogramImages.length; index++) {
		const image = SinogramImages[index];
		image.classList.remove("updating");
		image.classList.remove("error");
	}

	for (let index = 0; index < Overlays.length; index++) {
		const overlay = Overlays[index];
		overlay.classList.add("update");
		overlay.classList.remove("updating");
	}
}

function MarkError(): void {
	console.log("markerror");

	for (let index = 0; index < ReconImages.length; index++) {
		const image = ReconImages[index];
		image.classList.add("updating");
		image.classList.remove("error");
	}

	for (let index = 0; index < SliceImages.length; index++) {
		const image = SliceImages[index];
		image.classList.add("updating");
		image.classList.remove("error");
	}

	for (let index = 0; index < SinogramImages.length; index++) {
		const image = SinogramImages[index];
		image.classList.add("error");
		image.classList.remove("updating");
	}

	for (let index = 0; index < Overlays.length; index++) {
		const overlay = Overlays[index];
		overlay.classList.add("update");
		overlay.classList.remove("updating");
	}
}

function SetPreviewImages(preview: ReconstructionPreview): void {
	for (let index = 0; index < SliceImages.length; index++) {
		const image = SliceImages[index];
		image.src = "data:video/mp4;base64," + preview.slice.video;
	}
	for (let index = 0; index < SinogramImages.length; index++) {
		const image = SinogramImages[index];
		image.src = "data:video/mp4;base64," + preview.sino.video;
	}
	for (let index = 0; index < ReconImages.length; index++) {
		const image = ReconImages[index];
		image.src = "data:video/mp4;base64," + preview.recon.video;
	}
}
// ====================================================== //
// ==================== Page Updates ==================== //
// ====================================================== //

/**
 * Send current reconstruction settings to the server, then request new reconsurction properties.
 */
export function SyncRecon(): Promise<void> {
	return setRecon().then(() => {
		UpdateRecon();
	});
}

/**
 * Request reconstruction property data from the server.
 */
export function UpdateRecon(): Promise<void> {

	MarkNeedsUpdate();
	return requestReconData().then((response: Response) => {
		console.log("Reconstruction Data Response Status:" + response.status);
		if (response.status != 200) {
			return;
		}

		// Convert to json
		const result = response.json();

		result.then((result: unknown) => {
			const properties = processResponse(result as ReconResponseRegistry["reconResponse"], "reconResponse") as ReconstructionParams;
			console.log("---Received---");
			console.log(result);

			if (properties === undefined) {
				return;
			}

			// Update local values
			AlgElement.value = properties.method;
			QualityElement.value = properties.quality + "";

			let params;
			switch (properties.method) {
			case "FDK":
				params = properties as unknown as FDKParams;
				FDKFilter.value = params.filter + "";
				break;
			case "FBP":
				params = properties as unknown as FBPParams;
				FBPFilter.value = params.filter + "";
				break;
			case "CGLS":
				params = properties as CGLSParams;
				console.log("--params--");
				console.log(params);
				IterCGLSElement.value = params.iterations + "";
				ToleranceCGLSElement.value = params.tolerance + "";

				TikOpElement.value = params.operator.method;
				if (params.operator.method !== "projection") {
					// Projection tik method does not have an alpha parameter
					TikAlphaElement.value = params.operator.params.alpha + "";
				}

				if (params.operator.method == "gradient") {
					// Gradient tik method has a boundary condition
					TikBoundElement.value = params.operator.params.boundary;
				}
				break;
			default:
				break;
			}
		});
	});
}

function TikMethod():TikhonovMethod  {
	const val = TikOpElement.value as string;
	if (val.toLowerCase() === "identity") {
		return "identity";
	} else if (val.toLowerCase() == "gradient") {
		return "gradient";
	}
	return "projection";
}

function TikBoundValue(): "Neumann" | "Periodic" {
	const val = TikBoundElement.value as string;
	if (val.toLowerCase() === "periodic") {
		return "Periodic";
	}
	return "Neumann";
}

/**
 * Send capture parameters to the server.
 */
function setRecon(): Promise<void> {
	if (!validateRecon()) {
		throw Error;
	}

	// Collate paramaters for all reconstruction types
	const method = AlgElement.value + "";
	const quality = parseInt(QualityElement.value as string);

	const Tikhonov:TikhonovRegulariser = {
		method: TikMethod(),
		params: {
			alpha: parseFloat(TikAlphaElement.value),
			boundary: TikBoundValue(),
		}
	};

	const FDKParams:FDKParams = {
		method: "FDK",
		quality: quality as ReconQuality,
		filter: FDKFilter.value as string,
	};

	const FBPParams:FBPParams = {
		method: "FBP",
		quality: quality as ReconQuality,
		filter: FBPFilter.value as string,
	};

	const CGLSParams:CGLSParams = {
		method: "CGLS",
		quality: quality as ReconQuality,
		iterations: parseInt(IterCGLSElement.value),
		tolerance: parseFloat(ToleranceCGLSElement.value),
		operator: Tikhonov,
	};

	let request = undefined;
	switch (method) {
	case "FBP":
	default:
		request = prepareRequest(FBPParams);
		break;
	case "FDK":
		request = prepareRequest(FDKParams);
		break;
	case "CGLS":
		request = prepareRequest(CGLSParams);
		break;
	}
	console.log("---Sent---");
	console.log(request);
	return sendReconData(request).then((response: Response) => {
		if (response.status == 200) {
			console.log("Reconstruction updated");
		} else {
			console.error(response);
		}
	});
}

export function UpdateReconPreview(): Promise<void> {
	return UpdateRecon().then(() => {
		MarkLoading();

		requestReconPreview().then((response: Response) => {
			console.log("Reconstruction Preview Response Status:" + response.status);
			if (response.status == 500) {
				return;
			}

			// Convert to json
			const result = response.json();

			result.then((result: unknown) => {
				const preview = processResponse(result as ReconResponseRegistry["reconPreviewResponse"], "reconPreviewResponse") as ReconstructionPreview;
				window.dispatchEvent(new CustomEvent("stopLoading", {
					bubbles: true,
					cancelable: false,
					composed: false,
				}));

				SetPreviewImages(preview);
				MarkDone();
			}).catch(() => {
				MarkError();
			});
		}).catch(() => {
			MarkError();
		});
	}).catch(() => { MarkError(); });
}

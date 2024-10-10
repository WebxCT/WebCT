/**
 * Beam.ts : Functions relating to displaying and editing beam properties.
 * @author Iwan Mitchell
 */

import { SlCheckbox, SlInput, SlSelect } from "@shoelace-style/shoelace";
import { AlertType, showAlert } from "../../../base/static/js/base";
import { prepareRequest, processResponse, ReconResponseRegistry, requestReconData, requestReconPreview, sendReconData } from "./api";
import { BoxProximal, CGLSParams, Proximal, ProximalMethod, Differentiable, DiffMethod, FBPParams, FDKParams, FGPTVProximal, FISTAParams, LeastSquaresDiff, ReconstructionParams, ReconstructionPreview, SIRTParams, TGVProximal, TikhonovMethod as TikhonovMethod, TikhonovRegulariser, TVProximal } from "./types";
import { validateMethod } from "./validation";

// ====================================================== //
// ================== Document Elements ================= //
// ====================================================== //

export let AlgElement: SlSelect;
let AlgGroup: HTMLDivElement;

// FDK
let FDKSettings: HTMLDivElement;
let FDKFilter: SlSelect;

// FBK
let FBPSettings: HTMLDivElement;
let FBPFilter: SlSelect;

// CGLS
let CGLSSettings: HTMLDivElement;
let CGLSIterElement: SlInput;
let CGLSToleranceElement: SlInput;

// SIRT
let SIRTSettings: HTMLDivElement;
let SIRTIterElement: SlInput;

// FISTA
let FISTASettings: HTMLDivElement;
let FISTAIterElement: SlInput;

// Tikhonov
let TikSettings: HTMLDivElement;
let TikOpElement: SlSelect;
let TikAlphaElement: SlInput;
let TikBoundElement: SlSelect;

// Proximal
let ConSettings: HTMLDivElement;
let ConOpElement: SlSelect;
let ConCheckboxUpperElement: SlCheckbox;
let ConCheckboxLowerElement: SlCheckbox;
let ConUpperElement: SlInput;
let ConLowerElement: SlInput;
let ConUpperDiv: HTMLDivElement;
let ConLowerDiv: HTMLDivElement;
let ConIsotropicElement: SlCheckbox;
let ConToleranceElement: SlInput;
let ConIterElement: SlInput;
let ConAlphaElement: SlInput;
let ConNonNegElement: SlCheckbox;
let ConGammaElement: SlInput;

// Differentiable Function
let DiffSettings: HTMLDivElement;
let DiffOpElement: SlSelect;
let DiffLSScalingElement: SlInput;

let SliceImages: NodeListOf<HTMLVideoElement>;
let SinogramImages: NodeListOf<HTMLVideoElement>;
let ReconImages: NodeListOf<HTMLVideoElement>;
let CentreSliceImages: NodeListOf<HTMLVideoElement>;

let SliceOverlays: HTMLDivElement[];
let ReconOverlays: HTMLDivElement[];
let SinogramOverlays: HTMLDivElement[];
let CentreSliceOverlays: HTMLDivElement[];
let Overlays: HTMLDivElement[];

// ====================================================== //
// ======================= Globals ====================== //
// ====================================================== //

let ConUpperBound = "";
let ConLowerBound = "";

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
	CentreSliceImages = document.querySelectorAll("img.image-recon-centre") as NodeListOf<HTMLVideoElement>;

	// Convert to arrays for later concat
	SinogramOverlays = Array.prototype.slice.call(document.querySelectorAll(".overlay-sinogram") as NodeListOf<HTMLDivElement>);
	ReconOverlays = Array.prototype.slice.call(document.querySelectorAll(".overlay-recon") as NodeListOf<HTMLDivElement>);
	SliceOverlays = Array.prototype.slice.call(document.querySelectorAll(".overlay-slice") as NodeListOf<HTMLDivElement>);
	CentreSliceOverlays = Array.prototype.slice.call(document.querySelectorAll(".overlay-recon-centre") as NodeListOf<HTMLDivElement>);

	Overlays = SinogramOverlays
		.concat(ReconOverlays)
		.concat(CentreSliceOverlays)
		.concat(SliceOverlays);

	const select_alg = document.getElementById("selectReconstruction");
	const group_alg = document.getElementById("groupAlg");

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

	// SIRT
	const sirt_settings = document.getElementById("settingsSIRT");
	const sirt_input_iterations = document.getElementById("inputSIRTIterations");

	// FISTA
	const fista_settings = document.getElementById("settingsFISTA");
	const fista_input_iterations = document.getElementById("inputFISTAIterations");

	// Tikhonov
	const tik_settings = document.getElementById("settingsTikhonov");
	const tik_select_operator = document.getElementById("selectTikOperator");
	const tik_input_alpha = document.getElementById("inputTikAlpha");
	const tik_select_boundary = document.getElementById("selectTikBoundary");

	// Proximal
	const con_settings = document.getElementById("settingsProximal");
	const con_select_operator = document.getElementById("selectConOperator");
	const con_input_upper = document.getElementById("inputConUpper");
	const con_checkbox_upper = document.getElementById("checkboxConUpper");
	const con_input_lower = document.getElementById("inputConLower");
	const con_checkbox_lower = document.getElementById("checkboxConLower");
	const con_checkbox_isotropic = document.getElementById("checkboxConIsotropic");
	const con_input_tolerance = document.getElementById("inputConTolerance");
	const con_input_iter = document.getElementById("inputConIterations");
	const con_input_alpha = document.getElementById("inputConAlpha");
	const con_input_gamma = document.getElementById("inputConGamma");
	const con_checkbox_nonneg = document.getElementById("checkboxConNonNeg");

	// Differentiable Functions
	const diff_settings = document.getElementById("settingsDiff");
	const diff_select_operator = document.getElementById("selectDiffOperator");
	const diff_input_ls_scaling = document.getElementById("inputDiffLSScaling");

	if (select_alg == null ||
		group_alg == null ||
		fdk_select_filter == null ||
		fdk_settings == null ||
		fbp_settings == null ||
		fbp_select_filter == null ||
		cgls_settings == null ||
		cgls_input_iterations == null ||
		cgls_input_tolerance == null ||
		sirt_settings == null ||
		sirt_input_iterations == null ||
		fista_settings == null ||
		fista_input_iterations == null ||
		tik_settings == null ||
		tik_select_operator == null ||
		tik_input_alpha == null ||
		tik_select_boundary == null ||
		con_settings == null ||
		con_select_operator == null ||
		con_input_upper == null ||
		con_checkbox_upper == null ||
		con_input_lower == null ||
		con_checkbox_lower == null ||
		con_checkbox_isotropic == null ||
		con_input_tolerance == null ||
		con_input_iter == null ||
		con_input_alpha == null ||
		con_checkbox_nonneg == null ||
		con_input_gamma == null ||
		diff_settings == null ||
		diff_select_operator == null ||
		diff_input_ls_scaling == null) {

		console.log(select_alg);
		console.log(group_alg);

		console.log(fdk_settings);
		console.log(fdk_select_filter);

		console.log(fbp_settings);
		console.log(fbp_select_filter);

		console.log(cgls_settings);
		console.log(cgls_input_iterations);
		console.log(cgls_input_tolerance);

		console.log(sirt_settings);
		console.log(sirt_input_iterations);

		console.log(fista_settings);
		console.log(fista_input_iterations);

		console.log(tik_settings);
		console.log(tik_select_operator);
		console.log(tik_input_alpha);
		console.log(tik_select_boundary);

		console.log(con_settings);
		console.log(con_select_operator);
		console.log(con_input_upper);
		console.log(con_checkbox_upper);
		console.log(con_input_lower);
		console.log(con_checkbox_lower);
		console.log(con_checkbox_isotropic);
		console.log(con_input_tolerance);
		console.log(con_input_iter);
		console.log(con_input_alpha);
		console.log(con_checkbox_nonneg);
		console.log(con_input_gamma);


		console.log(diff_settings);
		console.log(diff_select_operator);
		console.log(diff_input_ls_scaling);


		showAlert("Reconstruction setup failure", AlertType.ERROR);
		return false;
	}

	AlgElement = select_alg as SlSelect;
	AlgGroup = group_alg as HTMLDivElement;

	// FDK
	FDKFilter = fdk_select_filter as SlSelect;
	FDKSettings = fdk_settings as HTMLDivElement;

	// FBK
	FBPFilter = fbp_select_filter as SlSelect;
	FBPSettings = fbp_settings as HTMLDivElement;

	// CGLS
	CGLSSettings = cgls_settings as HTMLDivElement;
	CGLSIterElement = cgls_input_iterations as SlInput;
	CGLSToleranceElement = cgls_input_tolerance as SlInput;

	// SIRT
	SIRTSettings = sirt_settings as HTMLDivElement;
	SIRTIterElement = sirt_input_iterations as SlInput;

	// FISTA
	FISTASettings = fista_settings as HTMLDivElement;
	FISTAIterElement = fista_input_iterations as SlInput;

	// Tikhonov
	TikSettings = tik_settings as HTMLDivElement;
	TikAlphaElement = tik_input_alpha as SlInput;
	TikBoundElement = tik_select_boundary as SlSelect;
	TikOpElement = tik_select_operator as SlSelect;

	// Proximals
	ConSettings = con_settings as HTMLDivElement;
	ConOpElement = con_select_operator as SlSelect;
	ConCheckboxUpperElement = con_checkbox_upper as SlCheckbox;
	ConCheckboxLowerElement = con_checkbox_lower as SlCheckbox;
	ConIsotropicElement = con_checkbox_isotropic as SlCheckbox;
	ConToleranceElement = con_input_tolerance as SlInput;
	ConIterElement = con_input_iter as SlInput;
	ConUpperElement = con_input_upper as SlInput;
	ConLowerElement = con_input_lower as SlInput;
	ConAlphaElement = con_input_alpha as SlInput;
	ConNonNegElement = con_checkbox_nonneg as SlCheckbox;
	ConGammaElement = con_input_gamma as SlInput;
	ConUpperDiv = ConUpperElement.parentElement as HTMLDivElement;
	ConLowerDiv = ConLowerElement.parentElement as HTMLDivElement;

	// Differentiable Function
	DiffSettings = diff_settings as HTMLDivElement;
	DiffOpElement = diff_select_operator as SlSelect;
	DiffLSScalingElement = diff_input_ls_scaling as SlInput;

	ConOpElement.addEventListener("sl-change", () => {

		// Disable and Hide all elements
		ConLowerDiv.classList.add("hidden");
		ConCheckboxLowerElement.disabled = true;
		ConLowerElement.disabled = true;

		ConUpperDiv.classList.add("hidden");
		ConCheckboxUpperElement.disabled = true;
		ConUpperElement.disabled = true;

		ConAlphaElement.disabled = true;
		ConAlphaElement.classList.add("hidden");

		ConIsotropicElement.disabled = true;
		ConIsotropicElement.classList.add("hidden");

		ConToleranceElement.disabled = true;
		ConToleranceElement.classList.add("hidden");

		ConIterElement.disabled = true;
		ConIterElement.classList.add("hidden");

		ConNonNegElement.disabled = true;
		ConNonNegElement.classList.add("hidden");

		ConGammaElement.disabled = true;
		ConGammaElement.classList.add("hidden");

		switch ((ConOpElement.value as string) as ProximalMethod) {
		case "box":
			ConLowerDiv.classList.remove("hidden");
			ConUpperDiv.classList.remove("hidden");
			ConCheckboxLowerElement.disabled = false;
			ConCheckboxUpperElement.disabled = false;
			ToggleConLower(ConCheckboxLowerElement.checked);
			ToggleConUpper(ConCheckboxUpperElement.checked);
			break;
		case "tv":
			ConLowerDiv.classList.remove("hidden");
			ConUpperDiv.classList.remove("hidden");
			ConCheckboxLowerElement.disabled = false;
			ConCheckboxUpperElement.disabled = false;
			ToggleConLower(ConCheckboxLowerElement.checked);
			ToggleConUpper(ConCheckboxUpperElement.checked);

			ConAlphaElement.disabled = false;
			ConAlphaElement.classList.remove("hidden");
			ConIsotropicElement.disabled = false;
			ConIsotropicElement.classList.remove("hidden");
			ConToleranceElement.disabled = false;
			ConToleranceElement.classList.remove("hidden");
			ConIterElement.disabled = false;
			ConIterElement.classList.remove("hidden");
			break;
		case "fgp-tv":
			ConAlphaElement.disabled = false;
			ConAlphaElement.classList.remove("hidden");
			ConIsotropicElement.disabled = false;
			ConIsotropicElement.classList.remove("hidden");
			ConToleranceElement.disabled = false;
			ConToleranceElement.classList.remove("hidden");
			ConNonNegElement.disabled = false;
			ConNonNegElement.classList.remove("hidden");
			ConIterElement.disabled = false;
			ConIterElement.classList.remove("hidden");
			break;
		case "tgv":
			ConAlphaElement.disabled = false;
			ConAlphaElement.classList.remove("hidden");
			ConToleranceElement.disabled = false;
			ConToleranceElement.classList.remove("hidden");
			ConIterElement.disabled = false;
			ConIterElement.classList.remove("hidden");
			ConGammaElement.disabled = false;
			ConGammaElement.classList.remove("hidden");
			break;
		}
	});

	ConCheckboxUpperElement.addEventListener("sl-change", () => {
		ToggleConUpper(ConCheckboxUpperElement.checked);
	});

	ConCheckboxLowerElement.addEventListener("sl-change", () => {
		ToggleConLower(ConCheckboxLowerElement.checked);
	});

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

	AlgElement.addEventListener("sl-change", () => {
		// Set group type
		AlgGroup.setAttribute("type", AlgElement.value + "");
		validateRecon();

		// Hide all settings menus
		FDKSettings.classList.add("hidden");
		FBPSettings.classList.add("hidden");
		CGLSSettings.classList.add("hidden");
		SIRTSettings.classList.add("hidden");
		FISTASettings.classList.add("hidden");
		TikSettings.classList.add("hidden");
		ConSettings.classList.add("hidden");
		DiffSettings.classList.add("hidden");

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
		case "SIRT":
			SIRTSettings.classList.remove("hidden");
			TikSettings.classList.remove("hidden");
			ConSettings.classList.remove("hidden");
			break;
		case "FISTA":
			FISTASettings.classList.remove("hidden");
			ConSettings.classList.remove("hidden");
			DiffSettings.classList.remove("hidden");
			break;
		}
	});

	// Run initial component updates
	ToggleConLower(ConCheckboxLowerElement.checked);
	ToggleConUpper(ConCheckboxUpperElement.checked);
	ConOpElement.handleValueChange();
	TikOpElement.handleValueChange();
	AlgElement.handleValueChange();

	validateRecon();
	return true;
}

export function validateRecon(): boolean {
	return true;
	// return validateMethod(AlgElement);
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

	for (let index = 0; index < CentreSliceImages.length; index++) {
		const image = CentreSliceImages[index];
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

	for (let index = 0; index < CentreSliceImages.length; index++) {
		const image = CentreSliceImages[index];
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

	for (let index = 0; index < CentreSliceImages.length; index++) {
		const image = CentreSliceImages[index];
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

	for (let index = 0; index < SliceImages.length; index++) {
		const image = CentreSliceImages[index];
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
	for (let index = 0; index < CentreSliceImages.length; index++) {
		const image = CentreSliceImages[index];
		image.src = "data:image/png;base64," + preview.centreSlice.image;
	}
}

function ToggleConUpper(state: boolean): void {
	if (state) {
		ConUpperElement.type = "number";
		ConUpperElement.value = ConUpperBound;
		ConUpperElement.disabled = false;
	} else {
		if (ConUpperElement.type !== "text") {
			// Do not overwrite if current state is already disabled
			ConUpperBound = ConUpperElement.value;
		}
		ConUpperElement.type = "text";
		ConUpperElement.value = "+Infinity";
		ConUpperElement.disabled = true;
	}
}

function ToggleConLower(state: boolean): void {
	if (state) {
		ConLowerElement.type = "number";
		ConLowerElement.value = ConLowerBound;
		ConLowerElement.disabled = false;
	} else {
		if (ConLowerElement.type !== "text") {
			// Do not overwrite if current state is already disabled
			ConLowerBound = ConLowerElement.value;
		}
		ConLowerElement.type = "text";
		ConLowerElement.value = "-Infinity";
		ConLowerElement.disabled = true;
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

function UpdateTikValues(params: TikhonovRegulariser): void {
	TikOpElement.value = params.method;
	// Force update even if new value is equal to old
	// This ensures disabled state of child items are correct.
	TikOpElement.handleValueChange();

	if (params.method !== "projection") {
		// Projection tik method does not have an alpha parameter
		TikAlphaElement.value = params.params.alpha + "";
	}

	if (params.method == "gradient") {
		// Gradient tik method has a boundary condition
		TikBoundElement.value = params.params.boundary;
	}
}

function UpdateConBoundCheckboxes(params: BoxProximal | TVProximal): void {
	if (params.params.lower == null) {
		ToggleConLower(false);
		ConCheckboxLowerElement.checked = false;
	} else {
		ConLowerBound = params.params.lower + "";
		ToggleConLower(true);
		ConCheckboxLowerElement.checked = true;
	}
	if ((params as BoxProximal).params.upper == null) {
		ToggleConUpper(false);
		ConCheckboxUpperElement.checked = false;
	} else {
		ConUpperBound = params.params.upper + "";
		ToggleConUpper(true);
		ConCheckboxUpperElement.checked = true;
	}
}

function UpdateConValues(params: Proximal): void {
	params = params as BoxProximal;
	ConOpElement.value = params.method;
	// Force update even if new value is equal to old
	// This ensures disabled state of child items are correct.
	ConOpElement.handleValueChange();

	const conTV: TVProximal = params as TVProximal;
	const conBox: BoxProximal = params as BoxProximal;
	const conFGPTV: FGPTVProximal = params as FGPTVProximal;
	const conTGV: TGVProximal = params as TGVProximal;

	switch (params.method) {
	case "box":
		UpdateConBoundCheckboxes(conBox);
		break;
	case "tv":
		ConIsotropicElement.checked = conTV.params.isotropic;
		ConIterElement.value = conTV.params.iterations + "";
		ConToleranceElement.value = conTV.params.tolerance + "";
		ConAlphaElement.value = conTV.params.alpha + "";
		UpdateConBoundCheckboxes(conTV);
		break;
	case "fgp-tv":
		ConIsotropicElement.checked = conFGPTV.params.isotropic;
		ConNonNegElement.checked = conFGPTV.params.nonnegativity;
		ConIterElement.value = conFGPTV.params.iterations + "";
		ConToleranceElement.value = conFGPTV.params.tolerance + "";
		ConAlphaElement.value = conFGPTV.params.alpha + "";
		break;
	case "tgv":
		ConIterElement.value = conTGV.params.iterations + "";
		ConAlphaElement.value = conTGV.params.alpha + "";
		ConToleranceElement.value = conTGV.params.tolerance + "";
		ConGammaElement.value = conTGV.params.gamma + "";
		break;
	}
	console.log(params);
}

function UpdateDiffValues(params: Differentiable): void {
	params = params as Differentiable;
	DiffOpElement.value = params.method;
	// Force update even if new value is equal to old
	// This ensures disabled state of child items are correct.
	DiffOpElement.handleValueChange();
	if (params.method == "least-squares") {
		const diffLS = params as LeastSquaresDiff;
		DiffLSScalingElement.value = diffLS.params.scaling_constant + "";
	}
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
		// Convert to text, since json will fail due to the inclusion of Infinity.
		const result = response.text();

		result.then((resultText: string) => {
			// Replace 'Infinity' with null, since json cannot represent negative infinity.
			resultText = resultText.replaceAll("-Infinity", "null");
			resultText = resultText.replaceAll("Infinity", "null");

			const resultJson = JSON.parse(resultText);
			const properties = processResponse(resultJson as ReconResponseRegistry["reconResponse"], "reconResponse") as ReconstructionParams;

			if (properties === undefined) {
				return;
			}

			setReconParams(properties);
		});
	});
}

function TikMethod(): TikhonovMethod {
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

	let request = undefined;
	request = prepareRequest(getReconParams());

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
				window.dispatchEvent(new CustomEvent("stopLoadingRecon", {
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

export function setReconParams(properties:ReconstructionParams) {
	// Update local values
	AlgElement.value = properties.method;

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
		CGLSIterElement.value = params.iterations + "";
		CGLSToleranceElement.value = params.tolerance + "";
		UpdateTikValues(params.operator);
		break;
	case "SIRT":
		params = properties as SIRTParams;
		SIRTIterElement.value = params.iterations + "";
		UpdateTikValues(params.operator);
		UpdateConValues(params.constraint);
		break;
	case "FISTA":
		params = properties as FISTAParams;
		FISTAIterElement.value = params.iterations + "";
		UpdateConValues(params.constraint);
		UpdateDiffValues(params.diff);
		break;
	}
}

export function getReconParams():ReconstructionParams {

	// Collate paramaters for all reconstruction types
	const method = AlgElement.value + "";

	const Tikhonov: TikhonovRegulariser = {
		method: TikMethod(),
		params: {
			alpha: parseFloat(TikAlphaElement.value),
			boundary: TikBoundValue(),
		}
	};

	const boxProximal: BoxProximal = {
		method: "box",
		params: {
			lower: ConCheckboxLowerElement.checked ? parseFloat(ConLowerElement.value) : null,
			upper: ConCheckboxUpperElement.checked ? parseFloat(ConUpperElement.value) : null,
		}
	};

	const tvProximal: TVProximal = {
		method: "tv",
		params: {
			iterations: parseInt(ConIterElement.value),
			alpha: parseFloat(ConAlphaElement.value),
			lower: ConCheckboxLowerElement.checked ? parseFloat(ConLowerElement.value) : null,
			upper: ConCheckboxUpperElement.checked ? parseFloat(ConUpperElement.value) : null,
			isotropic: ConIsotropicElement.checked,
			tolerance: parseFloat(ConToleranceElement.value),
		}
	};

	const fgptvProximal: FGPTVProximal = {
		method: "fgp-tv",
		params: {
			iterations: parseInt(ConIterElement.value),
			alpha: parseFloat(ConAlphaElement.value),
			isotropic: ConIsotropicElement.checked,
			tolerance: parseFloat(ConToleranceElement.value),
			nonnegativity: ConNonNegElement.checked,
		}
	};

	const tgvProximal: TGVProximal = {
		method: "tgv",
		params: {
			iterations: parseInt(ConIterElement.value),
			alpha: parseFloat(ConAlphaElement.value),
			tolerance: parseFloat(ConToleranceElement.value),
			gamma: parseFloat(ConGammaElement.value),
		}
	};

	// Select constraint
	let constraint: Proximal;
	switch (ConOpElement.value as ProximalMethod) {
	case "box":
	default:
		constraint = boxProximal;
		break;
	case "tv":
		constraint = tvProximal;
		break;
	case "fgp-tv":
		constraint = fgptvProximal;
		break;
	case "tgv":
		constraint = tgvProximal;
		break;
	}

	const lsDiff: LeastSquaresDiff = {
		method: "least-squares",
		params: {
			scaling_constant: parseFloat(DiffLSScalingElement.value),
		}
	};

	let diff: Differentiable;
	switch (DiffOpElement.value as DiffMethod) {
	case "least-squares":
	default:
		diff = lsDiff;
		break;
	}

	const FDKParams: FDKParams = {
		method: "FDK",
		filter: FDKFilter.value as string,
	};

	const FBPParams: FBPParams = {
		method: "FBP",
		filter: FBPFilter.value as string,
	};

	const CGLSParams: CGLSParams = {
		method: "CGLS",
		iterations: parseInt(CGLSIterElement.value),
		tolerance: parseFloat(CGLSToleranceElement.value),
		operator: Tikhonov,
	};

	const SIRTParams: SIRTParams = {
		method: "SIRT",
		iterations: parseInt(SIRTIterElement.value),
		operator: Tikhonov,
		constraint: constraint,
	};

	const FISTAParams: FISTAParams = {
		method: "FISTA",
		iterations: parseInt(FISTAIterElement.value),
		constraint: constraint,
		diff: diff,
	};

	switch (method) {
	case "FBP":
	default:
		return FBPParams;
	case "FDK":
		return FDKParams;
	case "CGLS":
		return CGLSParams;
	case "SIRT":
		return SIRTParams;
	case "FISTA":
		return FISTAParams;
	}

}

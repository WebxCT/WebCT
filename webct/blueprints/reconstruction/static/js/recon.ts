/**
 * Beam.ts : Functions relating to displaying and editing beam properties.
 * @author Iwan Mitchell
 */

import { SlCheckbox, SlInput, SlSelect } from "@shoelace-style/shoelace";
import { AlertType, showAlert } from "../../../base/static/js/base";
import { prepareRequest, processResponse, ReconResponseRegistry, requestReconData, requestReconPreview, sendReconData } from "./api";
import { BoxConstraint, CGLSParams, Constraint, ConstraintMethod, Differentiable, DiffMethod, FBPParams, FDKParams, FISTAParams, LeastSquaresDiff, ReconQuality, ReconstructionParams, ReconstructionPreview, SIRTParams, TikhonovMethod as TikhonovMethod, TikhonovRegulariser, TVConstraint } from "./types";
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

// Constraint
let ConSettings: HTMLDivElement;
let ConOpElement: SlSelect;
let ConCheckboxUpperElement: SlCheckbox;
let ConCheckboxLowerElement: SlCheckbox;
let ConUpperElement: SlInput;
let ConLowerElement: SlInput;
let ConTVIsotropicElement: SlCheckbox;
let ConTVToleranceElement: SlInput;
let ConTVIterElement: SlInput;
let ConTVAlphaElement: SlInput;

// Differentiable Function
let DiffSettings: HTMLDivElement;
let DiffOpElement: SlSelect;
let DiffLSScalingElement: SlInput;
let DiffLSWeightElement: SlInput;

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

	// Constraint
	const con_settings = document.getElementById("settingsConstraint");
	const con_select_operator = document.getElementById("selectConOperator");
	const con_input_upper = document.getElementById("inputConUpper");
	const con_checkbox_upper = document.getElementById("checkboxConUpper");
	const con_input_lower = document.getElementById("inputConLower");
	const con_checkbox_lower = document.getElementById("checkboxConLower");
	const con_checkbox_tv_isotropic = document.getElementById("checkboxConTVIsotropic");
	const con_input_tv_tolerance = document.getElementById("inputConTVTolerance");
	const con_input_tv_iter = document.getElementById("inputConTVIterations");
	const con_input_tv_alpha = document.getElementById("inputConTVAlpha");

	// Differentiable Functions
	const diff_settings = document.getElementById("settingsDiff");
	const diff_select_operator = document.getElementById("selectDiffOperator");
	const diff_input_ls_scaling = document.getElementById("inputDiffLSScaling");
	const diff_input_ls_weight = document.getElementById("inputDiffLSWeight");

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
		con_checkbox_tv_isotropic == null ||
		con_input_tv_tolerance == null ||
		con_input_tv_iter == null ||
		con_input_tv_alpha == null ||
		diff_settings == null ||
		diff_select_operator == null ||
		diff_input_ls_scaling == null ||
		diff_input_ls_weight == null) {

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
		console.log(con_checkbox_tv_isotropic);
		console.log(con_input_tv_tolerance);
		console.log(con_input_tv_iter);
		console.log(con_input_tv_alpha);

		console.log(diff_settings);
		console.log(diff_select_operator);
		console.log(diff_input_ls_scaling);
		console.log(diff_input_ls_weight);


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

	// Constraints
	ConSettings = con_settings as HTMLDivElement;
	ConOpElement = con_select_operator as SlSelect;
	ConCheckboxUpperElement = con_checkbox_upper as SlCheckbox;
	ConCheckboxLowerElement = con_checkbox_lower as SlCheckbox;
	ConTVIsotropicElement = con_checkbox_tv_isotropic as SlCheckbox;
	ConTVToleranceElement = con_input_tv_tolerance as SlInput;
	ConTVIterElement = con_input_tv_iter as SlInput;
	ConUpperElement = con_input_upper as SlInput;
	ConLowerElement = con_input_lower as SlInput;
	ConTVAlphaElement = con_input_tv_alpha as SlInput;

	// Differentiable Function
	DiffSettings = diff_settings as HTMLDivElement;
	DiffOpElement = diff_select_operator as SlSelect;
	DiffLSScalingElement = diff_input_ls_scaling as SlInput;
	DiffLSWeightElement = diff_input_ls_weight as SlInput;

	ConOpElement.addEventListener("sl-change", () => {

		// Disable and Hide all elements
		ConTVAlphaElement.disabled = true;
		ConTVAlphaElement.classList.add("hidden");
		ConTVIsotropicElement.disabled = true;
		ConTVIsotropicElement.classList.add("hidden");
		ConTVToleranceElement.disabled = true;
		ConTVToleranceElement.classList.add("hidden");
		ConTVIterElement.disabled = true;
		ConTVIterElement.classList.add("hidden");

		switch ((ConOpElement.value as string) as ConstraintMethod) {
		case "box":
			// Box only uses upper and lower bounds, which are enabled by
			// default.
			break;
		case "tv":
			// Enable & Show other elements
			ConTVAlphaElement.disabled = false;
			ConTVAlphaElement.classList.remove("hidden");
			ConTVIsotropicElement.disabled = false;
			ConTVIsotropicElement.classList.remove("hidden");
			ConTVToleranceElement.disabled = false;
			ConTVToleranceElement.classList.remove("hidden");
			ConTVIterElement.disabled = false;
			ConTVIterElement.classList.remove("hidden");
			break;
		}

		ToggleConLower(ConCheckboxLowerElement.checked);
		ToggleConUpper(ConCheckboxUpperElement.checked);
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

	BeamTypeElement.addEventListener("sl-change", () => {
		validateRecon();
	});

	// Run initial component updates
	ToggleConLower(ConCheckboxLowerElement.checked);
	ToggleConUpper(ConCheckboxUpperElement.checked);
	ConOpElement.handleValueChange();
	TikOpElement.handleValueChange();
	AlgElement.handleValueChange();
	QualityElement.handleValueChange();

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

function UpdateConValues(params: Constraint): void {
	params = params as BoxConstraint;
	ConOpElement.value = params.method;
	// Force update even if new value is equal to old
	// This ensures disabled state of child items are correct.
	ConOpElement.handleValueChange();
	console.log(params);
	if (params.method == "tv") {
		const conTV: TVConstraint = params as TVConstraint;
		ConTVIsotropicElement.checked = conTV.params.isotropic;
		ConTVIterElement.value = conTV.params.iterations + "";
		ConTVToleranceElement.value = conTV.params.tolerance + "";
	}
	if (params.params.lower == null) {
		ToggleConLower(false);
		ConCheckboxLowerElement.checked = false;
	} else {
		ConLowerBound = params.params.lower as string;
		ToggleConLower(true);
		ConCheckboxLowerElement.checked = true;
	}
	if ((params as BoxConstraint).params.upper == null) {
		ToggleConUpper(false);
		ConCheckboxUpperElement.checked = false;
	} else {
		ConUpperBound = params.params.upper as string;
		ToggleConUpper(true);
		ConCheckboxUpperElement.checked = true;
	}
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
		DiffLSWeightElement.value = diffLS.params.weight + "";
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
			console.log(resultJson);

			const properties = processResponse(resultJson as ReconResponseRegistry["reconResponse"], "reconResponse") as ReconstructionParams;
			console.log(properties);

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

	// Collate paramaters for all reconstruction types
	const method = AlgElement.value + "";
	const quality = parseInt(QualityElement.value as string);

	const Tikhonov: TikhonovRegulariser = {
		method: TikMethod(),
		params: {
			alpha: parseFloat(TikAlphaElement.value),
			boundary: TikBoundValue(),
		}
	};

	const boxConstraint: BoxConstraint = {
		method: "box",
		params: {
			lower: ConCheckboxLowerElement.checked ? parseFloat(ConLowerElement.value) : null,
			upper: ConCheckboxUpperElement.checked ? parseFloat(ConUpperElement.value) : null,
		}
	};

	const tvConstraint: TVConstraint = {
		method: "tv",
		params: {
			iterations: parseInt(ConTVIterElement.value),
			alpha: parseFloat(ConTVAlphaElement.value),
			lower: ConCheckboxLowerElement.checked ? parseFloat(ConLowerElement.value) : null,
			upper: ConCheckboxUpperElement.checked ? parseFloat(ConUpperElement.value) : null,
			isotropic: ConTVIsotropicElement.checked,
			tolerance: parseFloat(ConTVToleranceElement.value),
		}
	};

	// Select constraint
	let constraint: Constraint;
	switch (ConOpElement.value as ConstraintMethod) {
	case "box":
	default:
		constraint = boxConstraint;
		break;
	case "tv":
		constraint = tvConstraint;
		break;
	}

	const lsDiff:LeastSquaresDiff = {
		method: "least-squares",
		params: {
			scaling_constant: parseFloat(DiffLSScalingElement.value),
			weight: parseFloat(DiffLSWeightElement.value),
		}
	};

	let diff:Differentiable;
	switch (DiffOpElement.value as DiffMethod) {
	case "least-squares":
	default:
		diff = lsDiff;
		break;
	}

	const FDKParams: FDKParams = {
		method: "FDK",
		quality: quality as ReconQuality,
		filter: FDKFilter.value as string,
	};

	const FBPParams: FBPParams = {
		method: "FBP",
		quality: quality as ReconQuality,
		filter: FBPFilter.value as string,
	};

	const CGLSParams: CGLSParams = {
		method: "CGLS",
		quality: quality as ReconQuality,
		iterations: parseInt(CGLSIterElement.value),
		tolerance: parseFloat(CGLSToleranceElement.value),
		operator: Tikhonov,
	};

	const SIRTParams: SIRTParams = {
		method: "SIRT",
		quality: quality as ReconQuality,
		iterations: parseInt(SIRTIterElement.value),
		operator: Tikhonov,
		constraint: constraint,
	};

	const FISTAParams: FISTAParams = {
		method: "FISTA",
		quality: quality as ReconQuality,
		iterations: parseInt(FISTAIterElement.value),
		constraint: constraint,
		diff: diff,
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
	case "SIRT":
		request = prepareRequest(SIRTParams);
		break;
	case "FISTA":
		request = prepareRequest(FISTAParams);
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

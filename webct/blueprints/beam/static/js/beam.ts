/**
 * Beam.ts : Functions relating to displaying and editing beam properties.
 * @author Iwan Mitchell
 */

// Chart.js does not explicitly use all modules, so they must be registered,
// otherwise vague unhelpful runtime errors will occur...
import { SlButton, SlInput, SlSelect } from "@shoelace-style/shoelace";
import { AlertType, showAlert } from "../../../base/static/js/base";
import { AlgElement } from "../../../reconstruction/static/js/recon";
import { ReconMethod } from "../../../reconstruction/static/js/types";
import { BeamResponseRegistry, prepareRequest, processResponse, requestBeamData, sendBeamData } from "./api";
import { BeamConfigError, BeamRequestError, showError } from "./errors";
import { SpectraDisplay, ViewFormat } from "./types";
import { SupportedAnodes, validateAngle, validateFilter, validateVoltage } from "./validation";

// ====================================================== //
// ================== Document Elements ================= //
// ====================================================== //
let TubeVoltageElement: SlInput;
let TubeAngleElement: SlInput;
let TubeMaterialElement: SlSelect;

let FilterMaterialElement: SlSelect;
let FilterSizeElement: SlInput;

let BeamGeneratorElement: SlSelect;

// Beam projection type (cone, parallel) is used in the reconstruction stage to
// test for algorithm selection validity.
export let BeamTypeElement: SlSelect;

let SpectraCanvas: HTMLCanvasElement;


let spectraNormNoneButton: SlButton;
let spectraNorm01Button: SlButton;
let spectraNormPercentButton: SlButton;

// ====================================================== //
// ======================= Globals ====================== //
// ====================================================== //

let Spectra: SpectraDisplay;

// ====================================================== //
// ======================== Setup ======================= //
// ====================================================== //

/**
 * Setup Beam component for use, including element discovery, and initial state
 * api requests.
 */
export function setupBeam(): boolean {
	console.log("setupBeam");

	const tube_voltage_element = document.getElementById("inputTubeVoltage");
	const tube_angle_element = document.getElementById("inputTubeAngle");
	const tube_material_element = document.getElementById("selectTubeMaterial");
	const filter_material_element = document.getElementById("selectFilterMaterial");
	const filter_size_element = document.getElementById("inputFilterSize");
	const beam_generator_element = document.getElementById("selectBeamGen");
	const beam_type_element = document.getElementById("selectBeamType");
	const spectra_canvas = document.getElementById("spectra");

	const spectra_norm_none_button = document.getElementById("buttonSpectraNone");
	const spectra_norm01_button = document.getElementById("buttonSpectra01");
	const spectra_norm_percent_button = document.getElementById("buttonSpectraPercent");

	if (tube_voltage_element == null ||
		tube_angle_element == null ||
		tube_material_element == null ||
		filter_material_element == null ||
		filter_size_element == null ||
		beam_generator_element == null ||
		beam_type_element == null ||
		spectra_canvas == null ||
		spectra_norm_none_button == null ||
		spectra_norm01_button == null ||
		spectra_norm_percent_button == null
	) {
		console.log(tube_voltage_element);
		console.log(tube_angle_element);
		console.log(tube_material_element);
		console.log(beam_generator_element);
		console.log(beam_type_element);
		console.log(filter_material_element);
		console.log(filter_size_element);
		console.log(spectra_canvas);
		console.log(spectra_norm_none_button);
		console.log(spectra_norm01_button);
		console.log(spectra_norm_percent_button);
		showAlert("Beam setup failure", AlertType.ERROR);
		return false;
	}

	TubeVoltageElement = tube_voltage_element as SlInput;
	TubeVoltageElement.addEventListener("sl-change", () => {
		validateVoltage(TubeVoltageElement, TubeMaterialElement.value as SupportedAnodes);
	});
	TubeVoltageElement.addEventListener("sl-input", () => {
		validateVoltage(TubeVoltageElement, TubeMaterialElement.value as SupportedAnodes);
	});

	TubeAngleElement = tube_angle_element as SlInput;
	TubeAngleElement.addEventListener("sl-change", () => {
		validateAngle(TubeAngleElement);
	});
	TubeAngleElement.addEventListener("sl-input", () => {
		validateAngle(TubeAngleElement);
	});

	TubeMaterialElement = tube_material_element as SlSelect;
	TubeMaterialElement.addEventListener("sl-select", () => {
		validateVoltage(TubeVoltageElement, TubeMaterialElement.value as SupportedAnodes);
	});

	BeamGeneratorElement = beam_generator_element as SlSelect;
	BeamTypeElement = beam_type_element as SlSelect;

	FilterMaterialElement = filter_material_element as SlSelect;
	FilterSizeElement = filter_size_element as SlInput;
	FilterSizeElement.addEventListener("sl-change", () => {
		validateFilter(FilterSizeElement);
	});
	FilterSizeElement.addEventListener("sl-input", () => {
		validateFilter(FilterSizeElement);
	});


	SpectraCanvas = spectra_canvas as HTMLCanvasElement;

	spectraNormNoneButton = spectra_norm_none_button as SlButton;
	spectraNorm01Button = spectra_norm01_button as SlButton;
	spectraNormPercentButton = spectra_norm_percent_button as SlButton;

	spectraNormNoneButton.onclick = () => {
		spectraNormNoneButton.variant = "primary";
		spectraNorm01Button.variant = "default";
		spectraNormPercentButton.variant = "default";

		Spectra.viewFormat = "None";
	};

	spectraNorm01Button.onclick = () => {
		spectraNormNoneButton.variant = "default";
		spectraNorm01Button.variant = "primary";
		spectraNormPercentButton.variant = "default";

		Spectra.viewFormat = "0-1 Normalisation";
	};

	spectraNormPercentButton.onclick = () => {
		spectraNormNoneButton.variant = "default";
		spectraNorm01Button.variant = "default";
		spectraNormPercentButton.variant = "primary";

		Spectra.viewFormat = "Percentage";
	};

	BeamTypeElement.onclick = () => {
		const alg = AlgElement.value as ReconMethod;

		if (BeamTypeElement.value == "parallel") {
			if (alg == "FDK") {
				AlgElement.value = "FBP";
			}
		} else if (BeamTypeElement.value == "point") {
			if (alg == "FBP") {
				AlgElement.value = "FDK";
			}
		}
	};

	validateBeam();
	return true;
}

/**
 * Validate beam parameters and mark as valid/invalid.
 */
export function validateBeam(): boolean {
	return validateVoltage(TubeVoltageElement, TubeMaterialElement.value as SupportedAnodes)
		&& validateAngle(TubeAngleElement)
		&& validateFilter(FilterSizeElement);
}

// ====================================================== //
// =================== Display and UI =================== //
// ====================================================== //


// ====================================================== //
// ==================== Page Updates ==================== //
// ====================================================== //

/**
 * Send current beam settings to the server, then request new beam properties.
 */
export function SyncBeam(): Promise<void> {
	return setBeam().then(() => {
		UpdateBeam();
	});
}

/**
 * Request beam data from the server.
 */
export function UpdateBeam(): Promise<void> {

	return requestBeamData().then((response: Response) => {
		console.log("Beam Data Response Status:" + response.status);
		if (response.status == 400) {
			showError(BeamRequestError.UNSUPPORTED_PARAMETERS);
			return;
		} else if (response.status == 500) {
			showError(BeamRequestError.UNEXPECTED_SERVER_ERROR);
			return;
		}

		// Convert to json
		const result = response.json();

		result.then((result: unknown) => {

			const [properties, spectraFiltered, spectraUnfiltered,] = processResponse(result as BeamResponseRegistry["beamResponse"]);

			// update local values
			// no implicit cast from number to string, really js?
			TubeVoltageElement.value = properties.tubeVoltage + "";
			TubeAngleElement.value = properties.emissionAngle + "";
			TubeMaterialElement.value = properties.sourceMaterial + "";
			BeamGeneratorElement.value = properties.beamGenerator + "";
			BeamTypeElement.value = properties.beamProjection + "";

			FilterMaterialElement.value = properties.filters[0].material + "";
			FilterSizeElement.value = properties.filters[0].thickness + "";

			let format: ViewFormat = "None";
			if (Spectra?.viewFormat !== undefined) {
				format = Spectra?.viewFormat;
			}
			Spectra = new SpectraDisplay(spectraFiltered, spectraUnfiltered, properties, SpectraCanvas, format);

		}).catch(() => {
			showError(BeamRequestError.RESPONSE_DECODE);
		});
	}).catch(() => {
		showError(BeamRequestError.SEND_ERROR);
	});
}

/**
 * Send beam parameters to the server.
 */
function setBeam(): Promise<void> {

	if (!validateBeam()) {
		throw BeamConfigError;
	}

	const beam = prepareRequest({
		tubeVoltage: parseFloat(TubeVoltageElement.value),
		emissionAngle: parseFloat(TubeAngleElement.value),
		sourceMaterial: parseInt(TubeMaterialElement.value as string),
		filters: [
			{
				material: parseInt(FilterMaterialElement.value as string),
				thickness: parseFloat(FilterSizeElement.value)
			}
		],
		beamGenerator: BeamGeneratorElement.value as string,
		beamProjection: BeamTypeElement.value as string,
	});

	return sendBeamData(beam).then((response: Response) => {
		if (response.status == 200) {
			console.log("Beam updated");
		} else if (response.status == 400) {
			showError(BeamRequestError.UNSUPPORTED_PARAMETERS);
		} else {
			showError(BeamRequestError.UNEXPECTED_SERVER_ERROR);
		}
	}).catch(() => {
		showError(BeamRequestError.SEND_ERROR);
	});
}

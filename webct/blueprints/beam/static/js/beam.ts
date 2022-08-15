/**
 * Beam.ts : Functions relating to displaying and editing beam properties.
 * @author Iwan Mitchell
 */

// Chart.js does not explicitly use all modules, so they must be registered,
// otherwise vague unhelpful runtime errors will occur...
import { SlButton, SlCheckbox, SlInput, SlSelect } from "@shoelace-style/shoelace";
import { AlertType, showAlert } from "../../../base/static/js/base";
import { BeamResponseRegistry, processResponse, requestBeamData, sendBeamData } from "./api";
import { BeamConfigError, BeamRequestError, showError } from "./errors";
import { BeamGenerator, BeamProperties, Filter, LabBeam, MedBeam, SourceType, SpectraDisplay, SynchBeam, ViewFormat } from "./types";
import { validateFilter } from "./validation";

// ====================================================== //
// ================== Document Elements ================= //
// ====================================================== //
let TubeSettings: HTMLDivElement;

let BeamSourceSelectElement: SlSelect;
let BeamEnergyElement: SlInput;
let BeamExposureElement:SlInput;
let BeamVoltageElement:SlInput;
let BeamIntensityElement:SlInput;
let BeamMASElement:SlInput;
let BeamAngleElement:SlInput;
let BeamHarmonicsElement:SlCheckbox;
let BeamSpotSize:SlInput;

let BeamMaterialElement:SlInput;

let FilterMaterialElement: SlSelect;
let FilterSizeElement: SlInput;

let BeamGeneratorElement: SlSelect;

let SpectraCanvas: HTMLCanvasElement;


let spectraNormNoneButton: SlButton;
let spectraNorm01Button: SlButton;
export let spectraNormPercentButton: SlButton;

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

	const tube_settings_element = document.getElementById("settingsTube");

	const source_select_element = document.getElementById("selectBeamSource");
	const energy_element = document.getElementById("inputBeamEnergy");
	const exposure_element = document.getElementById("inputBeamExposure");
	const voltage_element = document.getElementById("inputBeamVoltage");
	const intensity_element = document.getElementById("inputBeamIntensity");
	const mas_element = document.getElementById("inputBeamMAS");
	const angle_element = document.getElementById("inputBeamAngle");
	const spot_size = document.getElementById("inputBeamSpotSize");

	const harmonics_element = document.getElementById("checkboxBeamHarmonics");

	const beam_material_element = document.getElementById("selectTubeMaterial");

	const filter_material_element = document.getElementById("selectFilterMaterial");
	const filter_size_element = document.getElementById("inputFilterSize");
	const beam_generator_element = document.getElementById("selectBeamGen");
	const spectra_canvas = document.getElementById("spectra");

	const spectra_norm_none_button = document.getElementById("buttonSpectraNone");
	const spectra_norm01_button = document.getElementById("buttonSpectra01");
	const spectra_norm_percent_button = document.getElementById("buttonSpectraPercent");

	if (tube_settings_element == null ||
		source_select_element == null ||
		energy_element == null ||
		exposure_element == null ||
		voltage_element == null ||
		intensity_element == null ||
		mas_element == null ||
		angle_element == null ||
		spot_size == null ||
		harmonics_element == null ||
		beam_material_element == null ||
		filter_material_element == null ||
		filter_size_element == null ||
		beam_generator_element == null ||
		spectra_canvas == null ||
		spectra_norm_none_button == null ||
		spectra_norm01_button == null ||
		spectra_norm_percent_button == null
	) {
		console.log(tube_settings_element);
		console.log(source_select_element);
		console.log(energy_element);
		console.log(exposure_element);
		console.log(voltage_element);
		console.log(intensity_element);
		console.log(mas_element);
		console.log(angle_element);
		console.log(spot_size);
		console.log(harmonics_element);
		console.log(beam_material_element);
		console.log(beam_generator_element);
		console.log(filter_material_element);
		console.log(filter_size_element);
		console.log(spectra_canvas);
		console.log(spectra_norm_none_button);
		console.log(spectra_norm01_button);
		console.log(spectra_norm_percent_button);
		showAlert("Beam setup failure", AlertType.ERROR);
		return false;
	}

	TubeSettings = tube_settings_element as HTMLDivElement;

	BeamEnergyElement = energy_element as SlInput;
	BeamExposureElement = exposure_element as SlInput;
	BeamVoltageElement = voltage_element as SlInput;
	BeamIntensityElement = intensity_element as SlInput;
	BeamMASElement = mas_element as SlInput;
	BeamAngleElement = angle_element as SlInput;
	BeamSpotSize = spot_size as SlInput;
	BeamMaterialElement = beam_material_element as SlInput;
	BeamHarmonicsElement = harmonics_element as SlCheckbox;

	BeamSourceSelectElement = source_select_element as SlSelect;
	BeamSourceSelectElement.addEventListener("sl-change", () => {
		TubeSettings.classList.add("hidden");
		BeamEnergyElement.classList.add("hidden");
		BeamExposureElement.classList.add("hidden");
		BeamVoltageElement.classList.add("hidden");
		BeamIntensityElement.classList.add("hidden");
		BeamMASElement.classList.add("hidden");
		BeamHarmonicsElement.classList.add("hidden");

		switch (BeamSourceSelectElement.value as SourceType) {
		case "lab":
			BeamVoltageElement.classList.remove("hidden");
			BeamExposureElement.classList.remove("hidden");
			BeamIntensityElement.classList.remove("hidden");
			TubeSettings.classList.remove("hidden");
			break;
		case "med":
			BeamVoltageElement.classList.remove("hidden");
			BeamMASElement.classList.remove("hidden");
			TubeSettings.classList.remove("hidden");
			break;
		case "synch":
			BeamEnergyElement.classList.remove("hidden");
			BeamExposureElement.classList.remove("hidden");
			BeamIntensityElement.classList.remove("hidden");
			BeamHarmonicsElement.classList.remove("hidden");
			break;
		}
	});
	BeamSourceSelectElement.handleValueChange();

	BeamGeneratorElement = beam_generator_element as SlSelect;

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

	// BeamTypeElement.onclick = () => {
	// 	const alg = AlgElement.value as ReconMethod;

	// 	if (BeamTypeElement.value == "parallel") {
	// 		if (alg == "FDK") {
	// 			AlgElement.value = "FBP";
	// 		}
	// 	} else if (BeamTypeElement.value == "point") {
	// 		if (alg == "FBP") {
	// 			AlgElement.value = "FDK";
	// 		}
	// 	}
	// };

	validateBeam();
	return true;
}

/**
 * Validate beam parameters and mark as valid/invalid.
 */
export function validateBeam(): boolean {
	return true;
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

		return result.then((result: unknown) => {

			const [properties, spectraFiltered, spectraUnfiltered,] = processResponse(result as BeamResponseRegistry["beamResponse"]);

			let params;
			BeamSourceSelectElement.value = properties.method;
			switch (properties.method) {
			case "lab":
				params = properties as LabBeam;
				BeamVoltageElement.value = params.voltage+"";
				BeamExposureElement.value = params.exposure+"";
				BeamIntensityElement.value = params.intensity+"";
				BeamAngleElement.value = params.anodeAngle+"";
				BeamGeneratorElement.value = params.generator;
				BeamMaterialElement.value = params.material+"";
				BeamSpotSize.value = params.spotSize+"";
				break;
			case "med":
				params = properties as MedBeam;
				BeamVoltageElement.value = params.voltage+"";
				BeamMASElement.value = params.mas+"";
				BeamGeneratorElement.value = params.generator;
				BeamAngleElement.value = params.anodeAngle+"";
				BeamMaterialElement.value = params.material+"";
				BeamSpotSize.value = params.spotSize+"";
				BeamVoltageElement.value = params.voltage+"";
				break;
			case "synch":
				params = properties as SynchBeam;
				BeamEnergyElement.value = params.energy+"";
				BeamExposureElement.value = params.exposure+"";
				BeamIntensityElement.value = params.intensity+"";
				break;
			}

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

	const BeamType = BeamSourceSelectElement.value as SourceType;
	let beam:BeamProperties;
	switch (BeamType) {
	case "lab":
		beam = new LabBeam(
			parseFloat(BeamVoltageElement.value as string),
			parseFloat(BeamExposureElement.value as string),
			parseFloat(BeamIntensityElement.value as string),
			parseFloat(BeamSpotSize.value as string),
			parseInt(BeamMaterialElement.value as string),
			BeamGeneratorElement.value as BeamGenerator,
			parseFloat(BeamAngleElement.value as string),
			[
				{
					material: parseInt(FilterMaterialElement.value as string),
					thickness: parseFloat(FilterSizeElement.value),
				} as Filter
			]
		);
		break;
	case "med":
		beam = new MedBeam(
			parseFloat(BeamVoltageElement.value as string),
			parseFloat(BeamMASElement.value as string),
			parseFloat(BeamSpotSize.value as string),
			parseInt(BeamMaterialElement.value as string),
			BeamGeneratorElement.value as BeamGenerator,
			parseFloat(BeamAngleElement.value as string),
			[
				{
					material: parseInt(FilterMaterialElement.value as string),
					thickness: parseFloat(FilterSizeElement.value),
				} as Filter
			]
		);
		break;
	case "synch":
		beam = new SynchBeam(
			parseFloat(BeamEnergyElement.value as string),
			parseFloat(BeamExposureElement.value as string),
			parseFloat(BeamIntensityElement.value as string),
			BeamHarmonicsElement.checked,
			[
				{
					material: parseInt(FilterMaterialElement.value as string),
					thickness: parseFloat(FilterSizeElement.value),
				} as Filter
			]
		);
		break;
	}

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

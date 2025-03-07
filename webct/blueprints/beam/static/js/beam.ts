/**
 * Beam.ts : Functions relating to displaying and editing beam properties.
 * @author Iwan Mitchell
 */

// Chart.js does not explicitly use all modules, so they must be registered,
// otherwise vague unhelpful runtime errors will occur...
import { SlButton, SlCheckbox, SlInput, SlSelect } from "@shoelace-style/shoelace";
import { AlertType, showAlert } from "../../../base/static/js/base";
import { AlgElement } from "../../../reconstruction/static/js/recon";
import { BeamResponseRegistry, processResponse, requestBeamData, sendBeamData } from "./api";
import { BeamConfigError, BeamRequestError, showError, showValidationError } from "./errors";
import { BeamGenerator, BeamProperties, Filter, LabBeam, MedBeam, SourceType, SpectraDisplay, SynchBeam, ViewFormat } from "./types";
import { SupportedAnodes, validateAngle, validateEnergy, validateExposure, validateFilter, validateFlux, validateIntensity, validateMAs, validateSpotSize, validateVoltage } from "./validation";
import { Valid } from "../../../base/static/js/validation";

// ====================================================== //
// ================== Document Elements ================= //
// ====================================================== //
let TubeSettings: HTMLDivElement;

export let BeamSourceSelectElement: SlSelect;
let BeamEnergyElement: SlInput;
let BeamNoiseElement:SlCheckbox;
let BeamExposureElement:SlInput;
let BeamVoltageElement:SlInput;
let BeamIntensityElement:SlInput;
let BeamFluxElement:SlInput;
let BeamMASElement:SlInput;
let BeamAngleElement:SlInput;
let BeamHarmonicsElement:SlCheckbox;
let BeamSpotSizeElement:SlInput;

let BeamMaterialElement:SlSelect;

let FilterSettings: HTMLDivElement;
let FilterMaterialElement: SlSelect;
let FilterSizeElement: SlInput;

let BeamGeneratorElement: SlSelect;

let SpectraCanvas: HTMLCanvasElement;

let TubePowerElement:HTMLParagraphElement;

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
	const noise_element = document.getElementById("checkboxNoiseEnabled");

	const exposure_element = document.getElementById("inputBeamExposure");
	const voltage_element = document.getElementById("inputBeamVoltage");
	const intensity_element = document.getElementById("inputBeamIntensity");
	const flux_element = document.getElementById("inputBeamFlux");
	const mas_element = document.getElementById("inputBeamMAS");
	const angle_element = document.getElementById("inputBeamAngle");
	const spot_size = document.getElementById("inputBeamSpotSize");

	const harmonics_element = document.getElementById("checkboxBeamHarmonics");

	const beam_material_element = document.getElementById("selectTubeMaterial");

	const filter_settings_element = document.getElementById("settingsFilter");
	const filter_material_element = document.getElementById("selectFilterMaterial");
	const filter_size_element = document.getElementById("inputFilterSize");

	const beam_generator_element = document.getElementById("selectBeamGen");
	const spectra_canvas = document.getElementById("spectra");

	const spectra_norm_none_button = document.getElementById("buttonSpectraNone");
	const spectra_norm01_button = document.getElementById("buttonSpectra01");
	const spectra_norm_percent_button = document.getElementById("buttonSpectraPercent");

	const tube_power_text = document.getElementById("textTubePower");

	if (tube_settings_element == null ||
		source_select_element == null ||
		energy_element == null ||
		noise_element == null ||
		exposure_element == null ||
		voltage_element == null ||
		intensity_element == null ||
		flux_element == null ||
		mas_element == null ||
		angle_element == null ||
		spot_size == null ||
		harmonics_element == null ||
		beam_material_element == null ||
		filter_settings_element == null ||
		filter_material_element == null ||
		filter_size_element == null ||
		beam_generator_element == null ||
		spectra_canvas == null ||
		spectra_norm_none_button == null ||
		spectra_norm01_button == null ||
		spectra_norm_percent_button == null ||
		tube_power_text == null
	) {
		console.log(tube_settings_element);
		console.log(source_select_element);
		console.log(energy_element);
		console.log(noise_element);
		console.log(exposure_element);
		console.log(voltage_element);
		console.log(intensity_element);
		console.log(flux_element);
		console.log(mas_element);
		console.log(angle_element);
		console.log(spot_size);
		console.log(harmonics_element);
		console.log(beam_material_element);
		console.log(beam_generator_element);
		console.log(filter_settings_element);
		console.log(filter_material_element);
		console.log(filter_size_element);
		console.log(spectra_canvas);
		console.log(spectra_norm_none_button);
		console.log(spectra_norm01_button);
		console.log(spectra_norm_percent_button);
		console.log(tube_power_text);
		showAlert("Beam setup failure", AlertType.ERROR);
		return false;
	}

	TubePowerElement = tube_power_text as HTMLParagraphElement;

	TubeSettings = tube_settings_element as HTMLDivElement;
	FilterSettings = filter_settings_element as HTMLDivElement;

	BeamEnergyElement = energy_element as SlInput;
	BeamEnergyElement.addEventListener("sl-change", () => {
		validateEnergy(BeamEnergyElement)
	})
	BeamNoiseElement = noise_element as SlCheckbox;
	BeamExposureElement = exposure_element as SlInput;
	BeamExposureElement.addEventListener("sl-change", () => {
		validateExposure(BeamExposureElement)
	})
	BeamVoltageElement = voltage_element as SlInput;
	BeamIntensityElement = intensity_element as SlInput;
	BeamIntensityElement.addEventListener("sl-change", () => {
		validateIntensity(BeamIntensityElement)
		updatePowerText()
	})
	BeamFluxElement = flux_element as SlInput;
	BeamFluxElement.addEventListener("sl-change", () =>{
		validateFlux(BeamFluxElement)
	})
	BeamMASElement = mas_element as SlInput;
	BeamMASElement.addEventListener("sl-change", () => {
		validateMAs(BeamMASElement)
	})
	BeamAngleElement = angle_element as SlInput;
	BeamAngleElement.addEventListener("sl-change", () => {
		validateAngle(BeamAngleElement)
	})
	BeamSpotSizeElement = spot_size as SlInput;
	BeamSpotSizeElement.addEventListener("sl-change", () => {
		validateSpotSize(BeamSpotSizeElement)
	})
	BeamMaterialElement = beam_material_element as SlSelect;
	BeamMaterialElement.addEventListener("sl-change", () => {
		validateVoltage(BeamVoltageElement, BeamMaterialElement.value as SupportedAnodes)
	})
	BeamVoltageElement.addEventListener("sl-change", () => {
		validateVoltage(BeamVoltageElement, BeamMaterialElement.value as SupportedAnodes)
		updatePowerText()
	})
	BeamHarmonicsElement = harmonics_element as SlCheckbox;

	BeamGeneratorElement = beam_generator_element as SlSelect;

	BeamNoiseElement.addEventListener("sl-change", () => {
		BeamExposureElement.disabled = !BeamNoiseElement.checked;
		BeamIntensityElement.disabled = !BeamNoiseElement.checked;
		BeamFluxElement.disabled = !BeamNoiseElement.checked;
		BeamMASElement.disabled = !BeamNoiseElement.checked;
	});

	BeamSourceSelectElement = source_select_element as SlSelect;
	BeamSourceSelectElement.addEventListener("sl-change", () => {
		TubeSettings.classList.add("hidden");
		BeamEnergyElement.classList.add("hidden");
		BeamExposureElement.classList.add("hidden");
		BeamVoltageElement.classList.add("hidden");
		BeamIntensityElement.classList.add("hidden");
		BeamFluxElement.classList.add("hidden");
		BeamMASElement.classList.add("hidden");
		BeamHarmonicsElement.classList.add("hidden");
		FilterSettings.classList.add("hidden");
		BeamGeneratorElement.classList.add("hidden");
		TubePowerElement.classList.add("hidden")

		switch (BeamSourceSelectElement.value as SourceType) {
		case "lab":
			BeamVoltageElement.classList.remove("hidden");
			BeamExposureElement.classList.remove("hidden");
			BeamIntensityElement.classList.remove("hidden");
			TubeSettings.classList.remove("hidden");
			FilterSettings.classList.remove("hidden");
			BeamGeneratorElement.classList.remove("hidden");
			TubePowerElement.classList.remove("hidden");

			if (AlgElement.value == "FBP") {
				AlgElement.value = "FDK";
			}

			break;
		case "med":
			BeamVoltageElement.classList.remove("hidden");
			BeamMASElement.classList.remove("hidden");
			TubeSettings.classList.remove("hidden");
			FilterSettings.classList.remove("hidden");
			BeamGeneratorElement.classList.remove("hidden");

			if (AlgElement.value == "FBP") {
				AlgElement.value = "FDK";
			}

			break;
		case "synch":
			BeamEnergyElement.classList.remove("hidden");
			BeamExposureElement.classList.remove("hidden");
			BeamFluxElement.classList.remove("hidden");
			BeamHarmonicsElement.classList.remove("hidden");

			if (AlgElement.value == "FDK") {
				AlgElement.value = "FBP";
			}

			break;
		}
	});
	BeamSourceSelectElement.handleValueChange();


	FilterMaterialElement = filter_material_element as SlSelect;
	FilterSizeElement = filter_size_element as SlInput;
	FilterSizeElement.addEventListener("sl-change", () => {
		validateFilter(FilterSizeElement);
	});
	FilterSizeElement.addEventListener("sl-input", () => {
		validateFilter(FilterSizeElement);
	});

	BeamSpotSizeElement.addEventListener("sl-input", () => {
		validateSpotSize(BeamSpotSizeElement)
	})
	BeamSpotSizeElement.addEventListener("sl-change", () => {
		validateSpotSize(BeamSpotSizeElement)
	})

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

	return true;
}

/**
 * Update source power [W] text using BeamVoltageElement and BeamIntensityElement inputs.
 */
function updatePowerText(): void {
	TubePowerElement.textContent = (parseFloat(BeamVoltageElement.value) * 1000 * parseFloat(BeamIntensityElement.value) * 0.000001).toFixed(2) + "W Source Power"
}

/**
 * Validate beam parameters and mark as valid/invalid.
 */
export function validateBeam(): void {
	let validationResults:Valid[] = []
	switch (BeamSourceSelectElement.value as SourceType) {
		case "lab":
			validationResults = [
				validateVoltage(BeamVoltageElement, BeamMaterialElement.value as SupportedAnodes),
				validateExposure(BeamExposureElement),
				validateIntensity(BeamIntensityElement),
				validateSpotSize(BeamSpotSizeElement),
				validateAngle(BeamAngleElement),
				validateFilter(FilterSizeElement)
			]
			break;
		case "med":
			validationResults = [
				validateVoltage(BeamVoltageElement, BeamMaterialElement.value as SupportedAnodes),
				validateMAs(BeamMASElement),
				validateSpotSize(BeamSpotSizeElement),
				validateAngle(BeamAngleElement),
				validateFilter(FilterSizeElement)
			]
			break;
		case "synch":
			validationResults = [
				validateEnergy(BeamEnergyElement),
				validateFlux(BeamFluxElement),
				validateExposure(BeamExposureElement)
			]
			break;
	}

	validationResults.forEach(validation => {
		if (!validation.valid) {
			// An element is invalid, bubble as an exception
			throw "<b>Invalid Beam Settings</b><br/> Your " + validation.InvalidReason as BeamConfigError
		}
	});
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

			setBeamParams(properties);

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

	try {
		validateBeam()
	} catch (e) {
		// Show the error and then re-throw to interrupt future chaining
		showValidationError(e as BeamConfigError)
		throw e
	}

	const beam = getBeamParms();

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

export function getBeamParms():BeamProperties {
	const BeamType = BeamSourceSelectElement.value as SourceType;
	let beam:BeamProperties;
	switch (BeamType) {
	case "lab":
		beam = new LabBeam(
			parseFloat(BeamVoltageElement.value as string),
			BeamNoiseElement.checked,
			parseFloat(BeamExposureElement.value as string),
			parseFloat(BeamIntensityElement.value as string),
			parseFloat(BeamSpotSizeElement.value as string),
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
			BeamNoiseElement.checked,
			parseFloat(BeamMASElement.value as string),
			parseFloat(BeamSpotSizeElement.value as string),
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
			BeamNoiseElement.checked,
			parseFloat(BeamExposureElement.value as string),
			parseFloat(BeamFluxElement.value as string),
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
	return beam;
}

export function setBeamParams(beam:BeamProperties) {
	let params;
	BeamSourceSelectElement.value = beam.method;
	BeamNoiseElement.checked = beam.enableNoise;

	switch (beam.method) {
	case "lab":
		params = beam as LabBeam;
		BeamVoltageElement.value = params.voltage+"";
		BeamExposureElement.value = params.exposure+"";
		BeamIntensityElement.value = params.intensity+"";
		BeamAngleElement.value = params.anodeAngle+"";
		BeamGeneratorElement.value = params.generator;
		BeamMaterialElement.value = params.material+"";
		BeamSpotSizeElement.value = params.spotSize+"";
		updatePowerText();
		break;
	case "med":
		params = beam as MedBeam;
		BeamVoltageElement.value = params.voltage+"";
		BeamMASElement.value = params.mas+"";
		BeamGeneratorElement.value = params.generator;
		BeamAngleElement.value = params.anodeAngle+"";
		BeamMaterialElement.value = params.material+"";
		BeamSpotSizeElement.value = params.spotSize+"";
		BeamVoltageElement.value = params.voltage+"";
		break;
	case "synch":
		params = beam as SynchBeam;
		BeamEnergyElement.value = params.energy+"";
		BeamExposureElement.value = params.exposure+"";
		BeamFluxElement.value = params.flux+"";
		break;
	}

	if (beam.method !== "synch") {
		if (beam.filters.length == 0) {
			FilterSizeElement.value = 0 + "";
		} else {
			FilterMaterialElement.value = beam.filters[0].material + "";
			FilterSizeElement.value = beam.filters[0].thickness + "";
		}
	}
}

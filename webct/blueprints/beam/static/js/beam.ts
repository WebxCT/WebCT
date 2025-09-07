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
import { Valid, validateInput } from "../../../base/static/js/validation";
import { DigitalTwin, TwinBeamFixedSpectrum } from "../../../twins/static/js/types";
import { SetTwin, TWIN, TWIN_LIST, UpdateTwinList } from "../../../twins/static/js/twin";

// ====================================================== //
// ================== Document Elements ================= //
// ====================================================== //

let TubeSettings: HTMLDivElement;

export let BeamSourceSelectElement: SlSelect;
export let TwinSelectElement: SlSelect;
let TwinSelectBeamElement: SlSelect;
let TwinSelectExposureElement: SlSelect;
let TwinDescriptionElement: HTMLParagraphElement;
let TwinFullNameElement: HTMLParagraphElement;
let TwinImageElement: HTMLImageElement;
let TwinDateElement: HTMLParagraphElement;

let BeamEnergyElement: SlInput;
let BeamNoiseElement: SlCheckbox;
let BeamExposureElement: SlInput;
let BeamVoltageElement: SlInput;
let BeamIntensityElement: SlInput;
let BeamFluxElement: SlInput;
let BeamMASElement: SlInput;
let BeamAngleElement: SlInput;
let BeamHarmonicsElement: SlCheckbox;
let BeamSpotSizeElement: SlInput;

let BeamMaterialElement: SlSelect;

let FilterSettings: HTMLDivElement;
let FilterMaterialElement: SlSelect;
let FilterSizeElement: SlInput;

let BeamGeneratorElement: SlSelect;

let SpectraCanvas: HTMLCanvasElement;

let TubePowerElement: HTMLParagraphElement;

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
	const twin_select_element = document.getElementById("selectTwin");
	const twin_select_beam_element = document.getElementById("selectTwinBeam")

	const tube_settings_element = document.getElementById("settingsTube");
	const twin_select_exposure_element = document.getElementById("selectTwinBeamExposure")
	const twin_fullname_element = document.getElementById("pTwinName")
	const twin_description_element = document.getElementById("pTwinDescription")
	const twin_image_element = document.getElementById("imgTwin")
	const twin_date_element = document.getElementById("pTwinDate")

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

	if (twin_select_element == null ||
		twin_select_beam_element == null ||
		tube_settings_element == null ||
		twin_select_exposure_element == null ||
		twin_fullname_element == null ||
		twin_description_element == null ||
		twin_image_element == null ||
		twin_date_element == null ||
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
		console.log(twin_select_element);
		console.log(twin_select_beam_element);
		console.log(tube_settings_element);
		console.log(twin_select_exposure_element);
		console.log(twin_fullname_element);
		console.log(twin_description_element)
		console.log(twin_image_element)
		console.log(twin_date_element);
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
	TwinSelectElement = twin_select_element as SlSelect;
	TwinSelectElement.addEventListener("sl-change", () => {
		SetTwin(TwinSelectElement.value as string)
	});

	TwinSelectBeamElement = twin_select_beam_element as SlSelect;
	TwinSelectBeamElement.addEventListener("sl-change", () => {
		SelectTwinBeam(TwinSelectBeamElement.value as string)
	});

	TwinSelectExposureElement = twin_select_exposure_element as SlSelect;
	TwinDescriptionElement = twin_description_element as HTMLParagraphElement;
	TwinFullNameElement = twin_fullname_element as HTMLParagraphElement;
	TwinImageElement = twin_image_element as HTMLImageElement;
	TwinDateElement = twin_date_element as HTMLParagraphElement;

	TubePowerElement = tube_power_text as HTMLParagraphElement;

	TubeSettings = tube_settings_element as HTMLDivElement;
	FilterSettings = filter_settings_element as HTMLDivElement;

	BeamEnergyElement = energy_element as unknown as SlInput;
	BeamEnergyElement.addEventListener("sl-change", () => {
		try { validateBeam() } catch { }
	})
	BeamNoiseElement = noise_element as SlCheckbox;
	BeamExposureElement = exposure_element as unknown as SlInput;
	BeamExposureElement.addEventListener("sl-change", () => {
		try { validateBeam() } catch { }
	})
	BeamVoltageElement = voltage_element as unknown as SlInput;
	BeamIntensityElement = intensity_element as unknown as SlInput;
	BeamIntensityElement.addEventListener("sl-change", () => {
		try { validateBeam() } catch { }
		updatePowerText()
	})
	BeamFluxElement = flux_element as unknown as SlInput;
	BeamFluxElement.addEventListener("sl-change", () => {
		try { validateBeam() } catch { }
	})
	BeamMASElement = mas_element as unknown as SlInput;
	BeamMASElement.addEventListener("sl-change", () => {
		try { validateBeam() } catch { }
	})
	BeamAngleElement = angle_element as unknown as SlInput;
	BeamAngleElement.addEventListener("sl-change", () => {
		try { validateBeam() } catch { }
	})
	BeamSpotSizeElement = spot_size as unknown as SlInput;
	BeamSpotSizeElement.addEventListener("sl-change", () => {
		try { validateBeam() } catch { }
	})
	BeamMaterialElement = beam_material_element as SlSelect;
	BeamMaterialElement.addEventListener("sl-change", () => {
		try { validateBeam() } catch { }
	})
	BeamVoltageElement.addEventListener("sl-change", () => {
		try { validateBeam() } catch { }
		updatePowerText()
	})
	BeamHarmonicsElement = harmonics_element as SlCheckbox;

	BeamGeneratorElement = beam_generator_element as SlSelect;

	BeamNoiseElement.addEventListener("sl-change", () => {
		BeamIntensityElement.disabled = !BeamNoiseElement.checked;
		BeamFluxElement.disabled = !BeamNoiseElement.checked;
		BeamMASElement.disabled = !BeamNoiseElement.checked;
		BeamExposureElement.disabled = !BeamNoiseElement.checked;
		TwinSelectExposureElement.disabled = !BeamNoiseElement.checked;

		if (TWIN !== null) {
			let beam = TWIN.beams[TwinSelectBeamElement.value as string]
			if (beam.beam_type == "fixed-spectrum") {
				// Flux from fixed spectrum cannot be changed.
				BeamFluxElement.disabled = true;
			} else if (beam.flux.curve.length !== 0) {
				// If twin has a flux curve, flux cannot be changed.
				BeamFluxElement.disabled = true;
			}
		}
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

				// Reconstruction may not be supported, in which case AlgElement is null.
				if (AlgElement !== undefined && AlgElement.value == "FBP") {
					AlgElement.value = "FDK";
				}

				break;
			case "med":
				BeamVoltageElement.classList.remove("hidden");
				BeamMASElement.classList.remove("hidden");
				TubeSettings.classList.remove("hidden");
				FilterSettings.classList.remove("hidden");
				BeamGeneratorElement.classList.remove("hidden");

				if (AlgElement !== undefined && AlgElement.value == "FBP") {
					AlgElement.value = "FDK";
				}

				break;
			case "synch":
				BeamEnergyElement.classList.remove("hidden");
				BeamExposureElement.classList.remove("hidden");

				BeamFluxElement.classList.remove("hidden");
				BeamHarmonicsElement.classList.remove("hidden");

				if (AlgElement !== undefined && AlgElement.value == "FDK") {
					AlgElement.value = "FBP";
				}

				break;
		}
	});
	BeamSourceSelectElement.handleValueChange();

	TwinSelectElement.handleValueChange();


	FilterMaterialElement = filter_material_element as SlSelect;
	FilterSizeElement = filter_size_element as unknown as SlInput;
	FilterSizeElement.addEventListener("sl-change", () => {
		try { validateBeam() } catch { }
	});
	FilterSizeElement.addEventListener("sl-input", () => {
		try { validateBeam() } catch { }
	});

	BeamSpotSizeElement.addEventListener("sl-input", () => {
		try { validateBeam() } catch { }
	})
	BeamSpotSizeElement.addEventListener("sl-change", () => {
		try { validateBeam() } catch { }
	})

	SpectraCanvas = spectra_canvas as HTMLCanvasElement;

	spectraNormNoneButton = spectra_norm_none_button as SlButton;
	spectraNorm01Button = spectra_norm01_button as SlButton;
	spectraNormPercentButton = spectra_norm_percent_button as SlButton;

	spectraNormNoneButton.addEventListener("click", () => {
		spectraNormNoneButton.variant = "primary";
		spectraNorm01Button.variant = "default";
		spectraNormPercentButton.variant = "default";

		Spectra.viewFormat = "None";
	});

	spectraNorm01Button.addEventListener("click", () => {
		spectraNormNoneButton.variant = "default";
		spectraNorm01Button.variant = "primary";
		spectraNormPercentButton.variant = "default";

		Spectra.viewFormat = "0-1 Normalisation";
	});

	spectraNormPercentButton.addEventListener("click", () => {
		spectraNormNoneButton.variant = "default";
		spectraNorm01Button.variant = "default";
		spectraNormPercentButton.variant = "primary";

		Spectra.viewFormat = "Percentage";
	});

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
	if (TWIN !== null) {
		ValidateTwinBeam()
		return;
	}

	let validationResults: Valid[] = []
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

	return UpdateTwinList().then(() => {
		requestBeamData().then((response: Response) => {
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

export function getBeamParms(): BeamProperties {
	const BeamType = BeamSourceSelectElement.value as SourceType;
	let beam: BeamProperties;
	switch (BeamType) {
		case "lab":
			beam = new LabBeam(
				TwinSelectElement.value as string,
				TwinSelectBeamElement.value as string,
				parseFloat(BeamVoltageElement.value as string),
				BeamNoiseElement.checked,
				((TWIN !== null && TWIN.detector.exposures.length > 0) ? parseFloat(TwinSelectExposureElement.value as string) : parseFloat(BeamExposureElement.value as string) ),
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
				TwinSelectElement.value as string,
				TwinSelectBeamElement.value as string,
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
			let generator: BeamGenerator = "monochromatic"
			if (TWIN != null) {
				if (TWIN.beams[TwinSelectBeamElement.value as string].beam_type == "fixed-spectrum") {
					generator = "static"
				}
			}

			beam = new SynchBeam(
				TwinSelectElement.value as string,
				TwinSelectBeamElement.value as string,
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
				],
				generator
			);
			break;
	}
	return beam;
}

export function setBeamParams(beam: BeamProperties) {
	let params;
	BeamSourceSelectElement.value = beam.method;
	TwinSelectElement.value = beam.twin;
	TwinSelectBeamElement.value = beam.twin_beam;
	BeamNoiseElement.checked = beam.enableNoise;

	switch (beam.method) {
		case "lab":
			params = beam as LabBeam;
			BeamVoltageElement.value = params.voltage + "";
			BeamExposureElement.value = params.exposure + "";
			BeamIntensityElement.value = params.intensity + "";
			BeamAngleElement.value = params.anodeAngle + "";
			BeamGeneratorElement.value = params.generator;
			BeamMaterialElement.value = params.material + "";
			BeamSpotSizeElement.value = params.spotSize + "";
			updatePowerText();
			break;
		case "med":
			params = beam as MedBeam;
			BeamVoltageElement.value = params.voltage + "";
			BeamMASElement.value = params.mas + "";
			BeamGeneratorElement.value = params.generator;
			BeamAngleElement.value = params.anodeAngle + "";
			BeamMaterialElement.value = params.material + "";
			BeamSpotSizeElement.value = params.spotSize + "";
			BeamVoltageElement.value = params.voltage + "";
			break;
		case "synch":
			params = beam as SynchBeam;
			BeamEnergyElement.value = params.energy + "";
			BeamExposureElement.value = params.exposure + "";
			BeamFluxElement.value = params.flux + "";
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

// ====================================================== //

export function SetBeamTwin(twin: DigitalTwin | null) {
	// Setup twin settings
	if (twin === null || twin === undefined) {
		TwinImageElement.classList.add("hidden")
		TwinFullNameElement.classList.add("hidden")
		TwinDescriptionElement.classList.add("hidden")
		TwinDateElement.classList.add("hidden")
		TwinSelectBeamElement.classList.add("hidden")

		// Set to empty to reset settings to normal
		SelectTwinBeam("")
		return
	}

	const full_name = twin.description.split("\n")[0]

	TwinImageElement.src = "./twins/img/" + twin.name + ".png"
	TwinFullNameElement.textContent = full_name
	TwinDescriptionElement.textContent = twin.description.split("\n").slice(1).join("\n")
	TwinDateElement.textContent = twin.date
	TwinImageElement.classList.remove("hidden")
	TwinFullNameElement.classList.remove("hidden")
	TwinDescriptionElement.classList.remove("hidden")
	TwinDateElement.classList.remove("hidden")
	TwinSelectBeamElement.classList.remove("hidden")

	// Create beam selection list
	let beamInner = "";
	let numberBeams = 0
	for (const key in twin.beams) {
		if (Object.prototype.hasOwnProperty.call(twin.beams, key)) {
			beamInner += "<sl-menu-item value=\"" + key + "\">" + key + "</sl-menu-item>";
			numberBeams += 1
		}
	}
	TwinSelectBeamElement.innerHTML = beamInner
	TwinSelectBeamElement.disabled = numberBeams < 2

	if (!Object.keys(twin.beams).includes(TwinSelectBeamElement.value as string)) {
		// Check if current twin beam key exists, otherwise default to first beam.
		TwinSelectBeamElement.value = Object.keys(twin.beams)[0]
	}

	SelectTwinBeam(TwinSelectBeamElement.value as string)

}

export function SelectTwinBeam(new_beam: string) {

	// Hide twin fixed exposure list
	TwinSelectExposureElement.classList.add("hidden");
	TwinSelectExposureElement.disabled = true;
	TwinSelectExposureElement.innerHTML = "";

	// Enable normal exposure, flux, and intensity element
	BeamExposureElement.classList.remove("hidden")

	if (BeamNoiseElement.checked) {
		BeamExposureElement.disabled = false;
		BeamIntensityElement.disabled = false;
		BeamFluxElement.disabled = false;
	}

	// Enable beam source type, material, and anode settings
	BeamSourceSelectElement.disabled = false;
	BeamMaterialElement.disabled = false;
	BeamAngleElement.disabled = false;

	// Enable all beam settings
	BeamEnergyElement.disabled = false;
	BeamVoltageElement.disabled = false;
	BeamHarmonicsElement.disabled = false;

	if (TWIN === null) {
		console.log("null");
		return;
	}

	if (!Object.prototype.hasOwnProperty.call(TWIN.beams, new_beam)) {
		console.log("beamfail");
		return;
	}

	let beam = TWIN.beams[new_beam]

	// Change source type depending on value
	switch (beam.shape) {
		case "parallel":
			BeamSourceSelectElement.value = "synch"
			break;

		default:
			BeamSourceSelectElement.value = "lab"
			break;
	}
	// We let beam selection take care of swapping out normal beam elements,
	// only managing twin elements or hiding unsupported options.
	BeamSourceSelectElement.handleValueChange().then(() => {

		if (TWIN == null) {
			return
		}

		// Disable constant beam settings
		BeamSourceSelectElement.disabled = true;
		BeamMaterialElement.disabled = true;
		BeamAngleElement.disabled = true;

		console.log(TWIN.detector.exposures.length !== 0);

		if (TWIN.detector.exposures.length !== 0) {

			// Add exposures Beam update should succeed before exposure applies, meaning
			// exposure value should be a correct setting after an update. We check to
			// see if the current exposure is in the approved exposure list and select
			// it, defaulting to the first exposure if not.
			BeamExposureElement.classList.add("hidden");
			BeamExposureElement.disabled = true;

			TwinSelectExposureElement.classList.remove("hidden")
			if (BeamNoiseElement.checked) {
				TwinSelectExposureElement.disabled = false;
			}

			let exposureInner = "";
			let found = false;
			TWIN.detector.exposures.forEach((value) => {
				exposureInner += "<sl-menu-item value=\"" + value + "\">" + value + "s</sl-menu-item>";
				if (value == parseFloat(BeamExposureElement.value)) {
					found = true
				}
			})
			TwinSelectExposureElement.innerHTML = exposureInner;

			if (found) {
				// Current exposure exists, select it
				TwinSelectExposureElement.value = BeamExposureElement.value
			} else {
				// Default to first exposure if the current exposure value is
				// unsupported by the twin.
				TwinSelectExposureElement.value = TWIN.detector.exposures[0] + ""
			}
		}

		if (beam.beam_type == "fixed-spectrum") {
			let fixedBeam = beam as (TwinBeamFixedSpectrum)
			let flux = fixedBeam.spectrum.reduce((sum, current) => sum + current[1], 0)
			if (beam.shape == "parallel") {

				// Synchrotron fixed-flux beam source
				BeamEnergyElement.classList.add("hidden")
				BeamFluxElement.disabled = true

				// beam flux is x10e10
				BeamFluxElement.value = flux / 10000000000 + ""

				// Cannot add harmonics to fixed spectrum beam
				BeamHarmonicsElement.classList.add("hidden")

			}
		} else if (beam.flux.curve.length !== 0) {
			if (beam.shape == "point") {
				// Flux is derived from intensity - kv calculations
			} else if (beam.shape == "parallel") {
				// Flux is derived from energy equations
				BeamFluxElement.disabled = true;
			}
		}
	});
}

export function PopulateTwinList() {

	// CBCT and Synchrotron sources are seperate in the menu
	let ct_sources = ""
	let synch_sources = ""

	// Iterate through each twin, constructing a menu element with name and
	// affiliation tags.
	for (const name in TWIN_LIST) {
		if (Object.prototype.hasOwnProperty.call(TWIN_LIST, name)) {
			const twin = TWIN_LIST[name];
			if (twin == null) {
				continue;
			}
			console.log(twin);

			let twin_node = "<sl-menu-item value=\"" + name + "\">"
			twin_node += twin.name
			twin_node += "<span> " + twin.description.split("\n")[0] + " </span>"

			// Check for full spectrum information or flux, indicating we've got
			// twin noise profiles.
			let beam = Object.values(twin.beams)[0]
			console.log(beam);

			if (beam.beam_type == "fixed-spectrum" ||
				(beam.beam_type == "monochromatic" && Object.prototype.hasOwnProperty("flux")) ||
				(beam.beam_type == "tube" && Object.prototype.hasOwnProperty("flux"))
			) {
				twin_node += "<sl-tag variant=\"success\" pill size=\"x-small\" title=\"Calibrated Digital Twin\">⭐</sl-tag>"
			}

			// Add facility tag
			switch (twin.facility) {
				case "Diamond Light Source":
					twin_node += "<sl-tag variant=\"warning\" pill size=\"x-small\">Diamond Light Source</sl-tag>"
					break;
				case "INSA-Lyon":
					twin_node += "<sl-tag variant=\"danger\" pill size=\"x-small\">INSA-Lyon</sl-tag>"
					break;
				default:
					twin_node += "<sl-tag pill size=\"x-small\">" + twin.facility + "</sl-tag>"
					break;
			}

			twin_node += "</sl-menu-item>"

			// Add twin to either synchrotron or ct sources based on first beam
			// shape.
			if (beam.shape == "parallel") {
				synch_sources += twin_node;
			} else {
				ct_sources += twin_node;
			}
		}
	}

	TwinSelectElement.innerHTML = "<sl-menu-item value=\"none\" checked>None</sl-menu-item>"
	TwinSelectElement.innerHTML += "<sl-divider></sl-divider>"
	TwinSelectElement.innerHTML += "<sl-menu-label>Lab CT Sources</sl-menu-label>"
	TwinSelectElement.innerHTML += ct_sources
	TwinSelectElement.innerHTML += "<sl-divider></sl-divider>"
	TwinSelectElement.innerHTML += "<sl-menu-label>Synchrotron Sources</sl-menu-label>"
	TwinSelectElement.innerHTML += synch_sources
	TwinSelectElement.value = "none";
}

function ValidateTwinBeam(): void {
	if (TWIN == null) {
		return;
	}
	let beam = TWIN.beams[TwinSelectBeamElement.value as string]

	let validationResults: Valid[] = []

	validationResults = [
		validateSpotSize(BeamSpotSizeElement),
		validateFilter(FilterSizeElement)
	]

	if (beam.beam_type == "tube") {
		validationResults.push(...[
			validateInput(BeamVoltageElement, "Tube Voltage", {
				type: "number",
				min: beam.keV[0],
				max: beam.keV[1],
				message: "Source only supports " + beam.keV[0] + "keV to " + beam.keV[1] + "keV"
			}),
			validateInput(BeamIntensityElement, "Tube Intensity", {
				type: "number",
				min: beam.uA[0],
				max: beam.uA[1],
				message: "Source only supports " + beam.uA[0] + "μA to " + beam.uA[1] + "μA"
			})
		])
	} else if (beam.beam_type == "monochromatic") {
		validationResults.push(...[
			validateInput(BeamEnergyElement, "Synchrotron Energy", {
				type: "number",
				min: beam.keV[0],
				max: beam.keV[1],
				message: "Source only supports " + beam.keV[0] + "keV to " + beam.keV[1] + "keV"
			}),
		])
	}

	validationResults.forEach(validation => {
		if (!validation.valid) {
			// An element is invalid, bubble as an exception
			throw "<b>Invalid Beam Settings</b><br/> Your " + validation.InvalidReason as BeamConfigError
		}
	});
}

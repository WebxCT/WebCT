/**
 * Validation.ts : Validate beam parameters
 * @author Iwan Mitchell
 */

import { SlInput } from "@shoelace-style/shoelace";
import { AlertType, showAlert } from "../../../base/static/js/base";
import { Valid, validateInput, Validator } from "../../../base/static/js/validation";

export type SupportedAnodes = "74" | "45" | "42"

/**
 * Available anode voltage validators.
 */
const VoltageValidators = new Map<string, Validator>([
	["74",
		{
			type: "number",
			max: 300,
			min: 31,
			message: "Tungsten only supports voltages between 31keV - 300keV."
		}
	],
	["42",
		{
			type: "number",
			max: 50,
			min: 21,
			message: "Molybdenum only supports voltages between 21keV - 50keV."
		}
	],
	["45",
		{
			type: "number",
			max: 50,
			min: 21,
			message: "Rhodium only supports voltages between 21keV - 50keV."
		}
	],
]);

/**
 * Validate Voltage input of X-Ray Tube.
 * @param VoltageElement - Tube Voltage Input to validate.
 * @param material - Material of X-Ray Tube.
 * @returns True if input is valid, false otherwise. Side effect: Passed element will have help-text displaying the validation failure reason.
 */
export function validateVoltage(VoltageElement: SlInput, material: SupportedAnodes): Valid {
	const validator = VoltageValidators.get(material);
	if (validator == null) {
		showAlert("No validator for " + VoltageElement, AlertType.ERROR);
		return {valid:false, InvalidReason:"an unknown source type"};
	}

	return validateInput(VoltageElement, "Tube Voltage", validator);
}


/**
 * Anode Angle validator.
 */
const AngleValidator: Validator = {
	min: 0.1,
	max: 179.9,
	type: "number",
	message: "Anode Angle must be larger than 0, and less than 179 degrees."
};

/**
 * Validate Anode Angle text input.
 * @param AngleElement - Angle Input to validate.
 * @returns True if input is valid, false otherwise. Side effect: Passed element will have help-text displaying the validation failure reason.
 */
export function validateAngle(AngleElement: SlInput): Valid {
	return validateInput(AngleElement, "Anode Angle", AngleValidator);
}


/**
 * Filter Thickness validator.
 */
const FilterValidator: Validator = {
	min: 0,
	max: 1000,
	type: "number",
	message: "Filter thickness cannot be negative. Set to 0mm to disable."
};

/**
 * Validate Filter Thickness text input.
 * @param FilterElement - Filter Thickness input to validate.
 * @returns True if input is valid, false otherwise. Side effect: Passed element will have help-text displaying the validation failure reason.
 */
export function validateFilter(FilterElement: SlInput): Valid {
	return validateInput(FilterElement, "Filter Thickness", FilterValidator);
}

/**
 * Spot Size validator.
 */
const SpotSizeValidator: Validator = {
	min: 0,
	max: 10000,
	type: "number",
	message: "Focal Spot Size cannot be negative. Set to 0mm to disable."
};

/**
 * Validate Spot Size Thickness text input.
 * @param SpotSizeElement - Spot Size Thickness input to validate.
 * @returns True if input is valid, false otherwise. Side effect: Passed element will have help-text displaying the validation failure reason.
 */
export function validateSpotSize(SpotSizeElement: SlInput): Valid {
	return validateInput(SpotSizeElement, "Focal Spot Size", SpotSizeValidator);
}

/**
 * Exposure Validator
 */
const ExposureValidator:Validator = {
	min:0.0001,
	max:10000,
	type: "number",
	message: "Exposure must be larger than 0s."
}

/**
 * Validate exposure text input.
 * @param ExposureElement - Exposure input to validate.
 * @returns True if input is valid, False otherwise. Side Effect: passed element will have help-text displaying the validation failure reason.
 */
export function validateExposure(ExposureElement: SlInput): Valid {
	return validateInput(ExposureElement, "Exposure", ExposureValidator);
}

/**
 * Intensity Validator
 */
const IntensityValidator:Validator = {
	min:0.0001,
	max:10000,
	type: "number",
	message: "Intensity must be larger than 0uA."
}

/**
 * Validate intensity text input.
 * @param IntensityElement - Exposure input to validate.
 * @returns True if input is valid, False otherwise. Side Effect: passed element will have help-text displaying the validation failure reason.
 */
export function validateIntensity(IntensityElement: SlInput): Valid {
	return validateInput(IntensityElement, "Tube Intensity", IntensityValidator);
}

/**
 * Spectra Energy Validator
 */
const EnergyValidator:Validator = {
	min:1,
	max:10000,
	type: "number",
	message: "SpectraEnergy must be larger than 1keV."
}
/**
 * Validate Energy text input.
 * @param EnergyElement - Energy input to validate.
 * @returns True if input is valid, False otherwise. Side Effect: passed element will have help-text displaying the validation failure reason.
 */
export function validateEnergy(EnergyElement: SlInput): Valid {
	return validateInput(EnergyElement, "Spectra Energy", EnergyValidator);
}

/**
 * Flux Validator
 */
const FluxValidator:Validator = {
	min:0.0001,
	max:10000,
	type: "number",
	message: "Synchrotron Flux must be larger than 0.0001x10^10."
}
/**
 * Validate Flux text input.
 * @param FluxElement - Flux input to validate.
 * @returns True if input is valid, False otherwise. Side Effect: passed element will have help-text displaying the validation failure reason.
 */
export function validateFlux(FluxElement: SlInput): Valid {
	return validateInput(FluxElement, "Flux", FluxValidator);
}

/**
 * MAs Validator
 */
const MAsValidator:Validator = {
	min:0.0001,
	max:10000,
	type: "number",
	message: "mAs must be larger than 0mAs."
}
/**
 * Validate mAs text input.
 * @param MAsElement - mAs input to validate.
 * @returns True if input is valid, False otherwise. Side Effect: passed element will have help-text displaying the validation failure reason.
 */
export function validateMAs(MAsElement: SlInput): Valid {
	return validateInput(MAsElement, "mAs", MAsValidator);
}

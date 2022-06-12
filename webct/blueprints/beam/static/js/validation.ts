/**
 * Validation.ts : Validate beam parameters
 * @author Iwan Mitchell
 */

import { SlInput } from "@shoelace-style/shoelace";
import { AlertType, showAlert } from "../../../base/static/js/base";
import { validateInput, Validator } from "../../../base/static/js/validation";

export type SupportedAnodes = "74" | "45" | "42"

/**
 * Available anode voltage validators.
 */
const VoltageValidators = new Map<string, Validator>([
	["74",
		{
			type: "number",
			max: 300,
			min: 30,
			message: "Tungsten only supports voltages between 30keV - 300keV."
		}
	],
	["42",
		{
			type: "number",
			max: 50,
			min: 20,
			message: "Molybdenum only supports voltages between 20keV - 50keV."
		}
	],
	["45",
		{
			type: "number",
			max: 50,
			min: 20,
			message: "Rhodium only supports voltages between 20keV - 50keV."
		}
	],
]);

/**
 * Anode Angle validator.
 */
const AngleValidator: Validator = {
	min: 0.1,
	max: 360,
	type: "number",
	message: "Anode Angle must be between 0-360 degrees."
};

/**
 * Filter Thickness validator.
 */
const FilterValidator: Validator = {
	min: 0,
	max: 1000,
	type: "number",
	message: "Filter must be larger than 0mm thick."
};

/**
 * Validate Voltage input of X-Ray Tube.
 * @param VoltageElement - Tube Voltage Input to validate.
 * @param material - Material of X-Ray Tube.
 * @returns True if input is valid, false otherwise. Side effect: Passed element will have help-text displaying the validation failure reason.
 */
export function validateVoltage(VoltageElement: SlInput, material: SupportedAnodes): boolean {
	const validator = VoltageValidators.get(material);
	if (validator == null) {
		showAlert("No validator for " + VoltageElement, AlertType.ERROR);
		return false;
	}

	return validateInput(VoltageElement, validator);
}

/**
 * Validate Anode Angle text input.
 * @param AngleElement - Angle Input to validate.
 * @returns True if input is valid, false otherwise. Side effect: Passed element will have help-text displaying the validation failure reason.
 */
export function validateAngle(AngleElement: SlInput): boolean {
	return validateInput(AngleElement, AngleValidator);
}

/**
 * Validate Filter Thickness text input.
 * @param FilterElement - Filter Thickness input to validate.
 * @returns True if input is valid, false otherwise. Side effect: Passed element will have help-text displaying the validation failure reason.
 */
export function validateFilter(FilterElement: SlInput): boolean {
	return validateInput(FilterElement, FilterValidator);
}

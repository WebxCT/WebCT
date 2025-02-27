/**
 * Validation.ts : Validate reconstruction parameters
 * @author Iwan Mitchell
 */

import { SlInput, SlSelect } from "@shoelace-style/shoelace";
import { isValid, markValid, Valid, validateInput, Validator } from "../../../base/static/js/validation";
import { ReconMethod } from "./types";
import { BeamSourceSelectElement } from "../../../beam/static/js/beam";
import { SourceType } from "../../../beam/static/js/types";

export function validateMethod(MethodElement: SlSelect): Valid {
	let valid = true;
	let message = "";

	switch (BeamSourceSelectElement.value as SourceType) {
		case "lab":
		case "med":
			// X-ray tube beams are point-source and don't support FBP
			if (MethodElement.value as ReconMethod == "FBP") {
				message = "FBP Reconstruction only supports parallel beams (Synchrotron Source Type).";
				valid = false;
			}
			break;
		case "synch":
			// Synchrotron are parallel beams and don't support FDK
			if (MethodElement.value as ReconMethod == "FDK") {
				message = "FDK Reconstruction only supports cone beams (Lab CT & Medical Source Types).";
				valid = false;
			}
			break;
	}

	markValid(MethodElement, valid);

	if (!valid) {
		MethodElement.helpText = message;
		return {valid:false, InvalidReason:"Reconstruction Method is Unsupported for the Selected Scan Geometry. <br/>" + message}
	} else {
		MethodElement.helpText = "";
		return {valid:true}
	}
}

const IterationValidator: Validator = {
	min: 1,
	max: 1000,
	type: "int",
	message: "Iterations must be a non-negative whole number."
}

export function validateIterations(element:SlInput, name:string, recommended_max:number) : Valid {

	let valid = isValid(element as unknown as HTMLInputElement, IterationValidator)
	if (!valid.valid) {
		valid = {valid:false, InvalidReason: name + " " + valid.InvalidReason + ". <br/>" + IterationValidator.message}
	}

	// * Special-case: Large iterations can take a very long time, either for
	// * reconstruction or regularization. Therefore we have a unique "warning"
	// * state to indicate that a large value is not recommended.
	element.classList.remove("warning");

	if (valid.valid) {
		// Input is already validated to be an integer input.
		if (parseInt(element.value) > recommended_max) {
			// In this case, iterations is larger than the recommended max, so
			// change help-text to indicate as such, and mark input element as warning
			element.classList.add("warning");
			element.helpText = "Iterations act on the entire image volume. A large number of iterations will take a long time. It is recommended to use a lower value."
		} else {
			// element is valid, and also under the recommended amount.
			element.helpText = "";
			markValid(element, valid.valid);
		}
	} else {
		// element is invalid
		const message: string = IterationValidator.message == undefined ? "Must be between " + IterationValidator.min + " and " + IterationValidator.max + "." : IterationValidator.message;
		element.helpText = message;
		markValid(element, valid.valid);
	}

	return valid
}

const BoundValidator: Validator = {
	type: "number",
	message: "Bounds must be a number."
}

export function validateBound(element:SlInput, name:string): Valid {
	return validateInput(element, name, BoundValidator)
}

export function validateBounds(lower_element:SlInput, upper_element:SlInput, lower_name:string, upper_name:string): Valid {
	let lower_valid = validateInput(lower_element, lower_name, BoundValidator)
	let upper_valid = validateInput(upper_element, upper_name, BoundValidator)

	// We return after validating both inputs to prevent a condition where if
	// both are checked, an invalid upper proximal will prevent validation of
	// the lower proximal.

	if (!lower_valid.valid) {
		return lower_valid
	}

	if (!upper_valid.valid) {
		return upper_valid
	}

	// Constraint: Lower bound must be lower than the upper bound.
	// At this case, both are already validated as numbers
	let valid = parseFloat(upper_element.value) > parseFloat(lower_element.value)
	if (!valid) {
		markValid(lower_element, false)
		markValid(upper_element, false)
		upper_element.helpText = "Upper bounds must be higher than lower bounds."
		lower_element.helpText = "Lower bounds must be lower than higher bounds."

		return {valid: false, InvalidReason: upper_element + " must be higher than " + lower_name + "."}
	} else {
		return {valid: true}
	}
}

const AlphaValidator: Validator = {
	min: 0,
	max: 1,
	type: "number",
	message: "Alpha must be a number between 0 and 1."
}

/**
 * Validate Alpha text input.
 * @param AlphaElement - Alpha input to validate.
 * @returns True if input is valid, False otherwise. Side Effect: passed element will have help-text displaying the validation failure reason.
 */
export function validateAlpha(AlphaElement: SlInput, name:string): Valid {
	return validateInput(AlphaElement, name, AlphaValidator);
}

const GammaValidator: Validator = {
	min: 1,
	max: 2,
	type: "number",
	message: "Gamma must be a number between 1 and 2."
}

/**
 * Validate Gamma text input.
 * @param GammaElement - Gamma input to validate.
 * @returns True if input is valid, False otherwise. Side Effect: passed element will have help-text displaying the validation failure reason.
 */
export function validateGamma(GammaElement: SlInput, name:string): Valid {
	return validateInput(GammaElement, name, GammaValidator);
}


/**
 * Tolerance Validator
 */
const ToleranceValidator:Validator = {
	min:0.001,
	max:10000,
	type: "number",
	message: "Tolerance must be larger than 0.001e-6"
}
/**
 * Validate Tolerance text input.
 * @param ToleranceElement - Tolerance input to validate.
 * @returns True if input is valid, False otherwise. Side Effect: passed element will have help-text displaying the validation failure reason.
 */
export function validateTolerance(ToleranceElement: SlInput, name:string): Valid {
	return validateInput(ToleranceElement, name, ToleranceValidator);
}

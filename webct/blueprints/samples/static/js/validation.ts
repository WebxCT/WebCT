/**
 * Validation.ts : Validate sample parameters
 * @author Iwan Mitchell
 */

import { SlInput } from "@shoelace-style/shoelace";
import { markValid, Valid, validateInput, validateInputWithHelptext, Validator } from "../../../base/static/js/validation";
import { SampleProperties } from "./types";

/**
 * Scaling Validator
 */
const ScalingValidator:Validator = {
	min:0.0001,
	type: "number",
	message: "Global Sample Scaling must be larger than 0."
}
/**
 * Validate Scaling text input.
 * @param ScalingElement - Scaling input to validate.
 * @returns True if input is valid, False otherwise. Side Effect: passed element will have help-text displaying the validation failure reason.
 */
export function validateScaling(ScalingElement: SlInput): Valid {
	return validateInputWithHelptext(ScalingElement, "Global Scaling", ScalingValidator, "Scaling factor for all samples. 1.00 = 1mm (default).");
}

export function validateSampleLabel(LabelElement:SlInput, SessionSamples:Record<string, SampleProperties>): Valid {
	if (LabelElement.value == "") {
		markValid(LabelElement, false)
		LabelElement.helpText = "Sample label must have a unique label.";
		return {valid: false, InvalidReason: "Sample label must have a unique label."}
	}

	if (LabelElement.value in SessionSamples) {
		// do not allow empty input or duplicate labels
		markValid(LabelElement, false);
		LabelElement.helpText = "Sample Label already exists.";
		return {valid: false, InvalidReason: "Sample label must have a unique label."}
	}

	markValid(LabelElement, true);
	LabelElement.helpText = "";
	return {valid: true}
}

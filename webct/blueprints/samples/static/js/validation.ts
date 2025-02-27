/**
 * Validation.ts : Validate sample parameters
 * @author Iwan Mitchell
 */

import { SlInput } from "@shoelace-style/shoelace";
import { Valid, validateInputWithHelptext, Validator } from "../../../base/static/js/validation";

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

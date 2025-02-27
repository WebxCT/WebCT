/**
 * Validation.ts : Validate beam parameters
 * @author Iwan Mitchell
 */

import { SlInput } from "@shoelace-style/shoelace";
import { Valid, validateInput, Validator } from "../../../base/static/js/validation";

/**
 * Validator for projection count.
 */
const ProjectionValidator: Validator = {
	min: 2,
	max: 10000,
	type: "int",
	message: "Number of projections must be a whole number larger than 2, and less than 10000."
};

export function validateProjections(ProjectionElement: SlInput): Valid {
	return validateInput(ProjectionElement, "Number of Projections", ProjectionValidator);
}

/**
 * Rotation Validator
 */
const RotationValidator:Validator = {
	type: "number",
	message: "Rotation must be a number."
}
/**
 * Validate Sample Rotation text input.
 * @param RotationElement - Rotation input to validate.
 * @returns True if input is valid, False otherwise. Side Effect: passed element will have help-text displaying the validation failure reason.
 */
export function validateRotation(RotationElement: SlInput): Valid {
	return validateInput(RotationElement, "Sample Rotation", RotationValidator);
}

/**
 * Validate Scene Rotation text input.
 * @param RotationElement - Rotation input to validate.
 * @returns True if input is valid, False otherwise. Side Effect: passed element will have help-text displaying the validation failure reason.
 */
export function validateSceneRotation(RotationElement: SlInput): Valid {
	return validateInput(RotationElement, "Scene Rotation", RotationValidator);
}
/**
 * Position Validator
 */
const PositionValidator:Validator = {
	type: "number",
	message: "Position must be a number."
}
/**
 * Validate Source Position text input.
 * @param SourcePositionElement - Source Position element to validate.
 * @returns True if input is valid, False otherwise. Side Effect: passed element will have help-text displaying the validation failure reason.
 */
export function validateSourcePosition(SourcePositionElement: SlInput): Valid {
	return validateInput(SourcePositionElement, "Source Position", PositionValidator);
}
/**
 * Validate Detector Position text input.
 * @param DetectorPositionElement - Detector Position element input to validate.
 * @returns True if input is valid, False otherwise. Side Effect: passed element will have help-text displaying the validation failure reason.
 */
export function validateDetectorPosition(DetectorPositionElement: SlInput): Valid {
	return validateInput(DetectorPositionElement, "Detector Position", PositionValidator);
}

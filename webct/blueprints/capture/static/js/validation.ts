/**
 * Validation.ts : Validate beam parameters
 * @author Iwan Mitchell
 */

import { SlInput } from "@shoelace-style/shoelace";
import { validateInput, Validator } from "../../../base/static/js/validation";

/**
 * Validator for projection count.
 */
const ProjectionValidator: Validator = {
	min: 2,
	max: 2000,
	type: "int",
	message: "Number of projections must be a whole number larger than 2, and less than 2000."
};

export function validateProjections(ProjectionElement: SlInput): boolean {
	return validateInput(ProjectionElement, ProjectionValidator);
}

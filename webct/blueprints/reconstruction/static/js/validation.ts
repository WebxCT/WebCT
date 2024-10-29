/**
 * Validation.ts : Validate beam parameters
 * @author Iwan Mitchell
 */

import { SlInput, SlSelect } from "@shoelace-style/shoelace";
import { markValid, validateInput, Validator } from "../../../base/static/js/validation";
import { ReconMethod } from "./types";

/**
 * Validator for projection count.
 */
const ProjectionValidator: Validator = {
	min: 2,
	max: 10000,
	type: "int",
	message: "Number of projections must be a whole number larger than 2, and less than 10000."
};

export function validateMethod(MethodElement: SlSelect): boolean {

	// Method validity is based on beam paramaters.
	// const projection = BeamTypeElement.value + "";
	const projection = "point";

	let valid = true;
	let message = "";

	switch (MethodElement.value as ReconMethod) {
	case "FBP":
		// FBP only works with parallel projections
		valid = false;
		if (!valid) {
			message = "FBP Reconstruction only supports parallel beam types.";
		}
		break;
	case "FDK":
		// FDK only works with point projections
		valid = projection == "point";
		if (!valid) {
			message = "FDK Reconstruction only supports cone beam types.";
		}
	default:
		break;
	}

	markValid(MethodElement, valid);

	if (!valid) {
		MethodElement.helpText = message;
	} else {
		MethodElement.helpText = "";
	}

	return valid;
}

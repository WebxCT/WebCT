/**
 * Validation.ts : Validate reconstruction parameters
 * @author Iwan Mitchell
 */

import { SlSelect } from "@shoelace-style/shoelace";
import { markValid, Valid } from "../../../base/static/js/validation";
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

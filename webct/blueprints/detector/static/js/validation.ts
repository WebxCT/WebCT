/**
 * Validation.ts : Validate detector parameters
 * @author Iwan Mitchell
 */

import { SlInput } from "@shoelace-style/shoelace";
import { Valid, validateInput, Validator } from "../../../base/static/js/validation";

const HeightValidator: Validator = {
	min: 0.1,
	max: 10000,
	type: "number",
	message: "Height must be larger than 0.1mm and less than 10000mm."
};

export function validateHeight(HeightElement: SlInput): Valid {
	return validateInput(HeightElement, "Detector Pane Height", HeightValidator);
}

const WidthValidator: Validator = {
	min: 0.1,
	max: 10000,
	type: "number",
	message: "Width must be larger than 0.1mm and less than 10000mm."
};
export function validateWidth(WidthElement: SlInput): Valid {
	return validateInput(WidthElement, "Detector Pane Width", WidthValidator);
}

/**
 * WidthPx Validator
 */
const WidthPxValidator:Validator = {
	min:1,
	max:10000,
	type: "int",
	message: "Pixel width must be a whole number larger than 0px, and less than 10000px."
}
/**
 * Validate WidthPx text input.
 * @param WidthPxElement - WidthPx input to validate.
 * @returns True if input is valid, False otherwise. Side Effect: passed element will have help-text displaying the validation failure reason.
 */
export function validateWidthPx(WidthPxElement: SlInput): Valid {
	return validateInput(WidthPxElement, "Detector Width in Pixels", WidthPxValidator);
}

/**
 * HeightPx Validator
 */
const HeightPxValidator:Validator = {
	min:1,
	max:10000,
	type: "int",
	message: "Pixel height must be a whole number larger than 0px, and less than 10000px."
}
/**
 * Validate HeightPx text input.
 * @param HeightPxElement - HeightPx input to validate.
 * @returns True if input is valid, False otherwise. Side Effect: passed element will have help-text displaying the validation failure reason.
 */
export function validateHeightPx(HeightPxElement: SlInput): Valid {
	return validateInput(HeightPxElement, "Detector Height in Pixels", HeightPxValidator);
}

const PixelSizeValidator: Validator = {
	min: 0.01,
	max: 100000,
	type: "number",
	message: "Pixel size must be larger than 0.01μm and less than 10cm (100000μm)."
};

export function validatePixel(PixelElement: SlInput): Valid {
	return validateInput(PixelElement, "Detector Pixel Size", PixelSizeValidator);
}

/**
 * Scintillator Validator
 */
const ScintillatorValidator:Validator = {
	min:1,
	type: "number",
	message: "Scintillator thickness must be larger than 1μm."
}
/**
 * Validate Scintillator text input.
 * @param ScintillatorElement - Scintillator input to validate.
 * @returns True if input is valid, False otherwise. Side Effect: passed element will have help-text displaying the validation failure reason.
 */
export function validateScintillator(ScintillatorElement: SlInput): Valid {
	return validateInput(ScintillatorElement, "Detector Scintillator Thickness", ScintillatorValidator);
}

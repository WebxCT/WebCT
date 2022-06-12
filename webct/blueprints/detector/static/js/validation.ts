/**
 * Validation.ts : Validate detector parameters
 * @author Iwan Mitchell
 */

import { SlInput } from "@shoelace-style/shoelace";
import { validateInput, Validator } from "../../../base/static/js/validation";

const HeightValidator: Validator = {
	min: 0.1,
	max: 10000,
	type: "number",
	message: "Height must be larger than 0.1mm and less than 10000mm"
};

const WidthValidator: Validator = {
	min: 0.1,
	max: 10000,
	type: "number",
	message: "Width must be larger than 0.1mm and less than 1mm"
};

const PixelValidator: Validator = {
	min: 0.0001,
	max: 100,
	type: "number",
	message: "Pixel size must be larger than 0.001mm and less than 100mm"
};

export function validateWidth(WidthElement: SlInput): boolean {
	return validateInput(WidthElement, WidthValidator);
}

export function validateHeight(HeightElement: SlInput): boolean {
	return validateInput(HeightElement, HeightValidator);
}

export function validatePixel(PixelElement: SlInput): boolean {
	return validateInput(PixelElement, PixelValidator);
}

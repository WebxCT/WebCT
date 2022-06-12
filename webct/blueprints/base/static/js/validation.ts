/**
 * Validation.ts : Validate Parameters
 * @author Iwan Mitchell
 */

import { SlInput } from "@shoelace-style/shoelace";

type ValidatorType = "int" | "number" | "string"

export interface Validator {
	type: ValidatorType,
	max: number,
	min: number,
	pattern?: string,
	message?: string,
	empty?:boolean,
}

/**
 * Validate and apply `valid` or `invalid` classes to elements, along with
 * setting `help-text` to the invalid reason. If a class is valid, `help-text`
 * is set to `""`.
 * @param element - Input element to validate.
 * @param validator - Validator containing validation rules.
 * @returns True if input is valid, false otherwise. Side effect: Passed element
 * will have help-text displaying the validation failure reason.
 */
export function validateInput(element: SlInput, validator: Validator): boolean {
	const valid = isValid(element as unknown as HTMLInputElement, validator);
	markValid(element, valid);

	if (!valid) {
		const message: string = validator.message == undefined ? "Must be between " + validator.min + " and " + validator.max + "." : validator.message;
		element.helpText = message;
	} else {
		element.helpText = "";
	}

	return valid;
}

/**
 * Set a valid or invalid attribute on an element.
 * @param element - Element to mark as valid or invalid
 * @param valid - True if valid, False otherwise.
 */
export function markValid(element: HTMLElement, valid: boolean): void {
	if (valid) {
		element.classList.add("valid");
		element.classList.remove("invalid");
	} else {
		element.classList.remove("valid");
		element.classList.add("invalid");
	}
}

/**
 * Validate an element.
 * @param inputElement - Input element to validate
 * @param validator - Validation Rules
 * @returns True if element is valid, false otherwise.
 */
export function isValid(inputElement: HTMLInputElement, validator: Validator): boolean {
	if (validator.type !== "int") {
		// int is a special number type, and will fail this check
		if (inputElement.type != validator.type) {
			return false;
		}
	}

	if (inputElement.value == "" && (validator.empty == undefined || validator.empty == true)) {
		return false;
	}

	let value = 0;

	if (validator.type == "number") {
		value = parseFloat(inputElement.value) as number;
	} else if (validator.type == "int") {
		console.log("parseint");
		value = parseInt(inputElement.value) as number;
	} else {
		value = inputElement.value.length as number;
	}

	if (value > validator.max) {
		return false;
	}

	if (value < validator.min) {
		return false;
	}

	return true;
}

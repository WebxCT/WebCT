/**
 * Validation.ts : Validate Parameters
 * @author Iwan Mitchell
 */

import { SlInput } from "@shoelace-style/shoelace";

type ValidatorType = "int" | "number" | "string"

export interface Validator {
	type: ValidatorType,
	max?: number,
	min?: number,
	pattern?: string,
	message?: string,
	empty?:boolean,
}

export interface Valid {
	// True if the element is valid, False otherwise
	valid: boolean
	// If valid is false, this is a short, all-lower case string stating why.
	// Such as "too large", "too small", etc. Followed by the validation message text.
	// E.g "is too small. Width must be larger than 0.1mm and less than 10000mm"
	InvalidReason?: string
}

/**
 * Validate and apply `valid` or `invalid` classes to elements, along with
 * setting `help-text` to the invalid reason. If a class is valid, `help-text`
 * is set to `""`.
 * @param element - Input element to validate.
 * @param name - Name of validation input (used for user-facing invalid messages).
 * @param validator - Validator containing validation rules.
 * @returns True if input is valid, false otherwise. Side effect: Passed element
 * will have help-text displaying the validation failure reason.
 */
export function validateInput(element: SlInput, name:string, validator: Validator): Valid {
	let valid = isValid(element as unknown as HTMLInputElement, validator);
	if (!valid.valid) {
		valid = {valid:false, InvalidReason: name + " " + valid.InvalidReason + ". <br/>" + validator.message}
	}
	markValid(element, valid.valid);

	if (!valid.valid) {
		const message: string = validator.message == undefined ? "Must be between " + validator.min + " and " + validator.max + "." : validator.message;
		element.helpText = message;
	} else {
		element.helpText = "";
	}

	return valid;
}

/**
 * Validate and apply `valid` or `invalid` classes to elements, along with
 * appending the invalid reason to `help-text`. If a class is valid, `help-text`
 * is set to the passed helptext.
 * @param element - Input element to validate.
 * @param name - Name of validation input (used for user-facing invalid messages).
 * @param validator - Validator containing validation rules.
 * @param helptext - Default help-text visible on the input element.
 * @returns True if input is valid, false otherwise. Side effect: Passed element
 * will have help-text displaying the validation failure reason.
 */
export function validateInputWithHelptext(element: SlInput, name:string, validator: Validator, helptext:string): Valid {
	let valid = isValid(element as unknown as HTMLInputElement, validator);
	if (!valid.valid) {
		valid = {valid:false, InvalidReason: name + " " + valid.InvalidReason + ". <br/>" + validator.message}
	}
	markValid(element, valid.valid);

	if (!valid.valid) {
		const message: string = validator.message == undefined ? "Must be between " + validator.min + " and " + validator.max + "." : validator.message;
		// help-text does not support <br>
		element.helpText = helptext + " " + message;
	} else {
		element.helpText = helptext;
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
export function isValid(inputElement: HTMLInputElement, validator: Validator): Valid {
	if (validator.type !== "int") {
		// int is a special number type, and will fail this check
		if (inputElement.type != validator.type) {
			if (validator.type == "number") {
				return {valid:false, InvalidReason: "isn't a number"}
			} else if (validator.type == "string") {
				return {valid:false, InvalidReason: "isn't text"}
			} else {
				return {valid:false, InvalidReason: "is the wrong type"}
			}
		}
	}

	if (inputElement.value == "" && (validator.empty == undefined || validator.empty == true)) {
		return {valid:false, InvalidReason: "cannot be empty"}
	}

	let value = 0;

	if (validator.type == "number") {
		value = parseFloat(inputElement.value) as number;
		// Parsefloat shouldn't* throw exceptions, and invalid input is returned as a NaN number.
		// * it may throw exceptions if the input cannot be coerced into a string
		if (Number.isNaN(value)) {
			return {valid:false, InvalidReason: "is not a number"}
		}
	} else if (validator.type == "int") {
		console.log("parseint");
		value = parseInt(inputElement.value) as number;
		if (Number.isNaN(value)) {
			return {valid:false, InvalidReason: "is not whole a number"}
		}
	} else {
		value = inputElement.value.length as number;
	}

	if (validator.max != undefined && value > validator.max) {
		if (validator.type == "string") {
			return {valid:false, InvalidReason: "is too long"}
		} else {
			return {valid:false, InvalidReason: "is too large"}
		}
	}

	if (validator.min != undefined && value < validator.min) {
		if (validator.type == "string") {
			return {valid:false, InvalidReason: "is too small"}
		} else {
			return {valid:false, InvalidReason: "is too small"}
		}
	}
	return {valid:true}
}

/**
 * Types.ts : General types for dealing with samples and their materials.
 * @author Iwan Mitchell
 */

/**
 * Sample model properties
 */
export interface SampleProperties {
	/**
	 * A human-friendly name of the sample
	 */
	label: string;
	/**
	 * A path to the .stl model of the sample (with the root as the model folder)
	 */
	modelPath: string;
	/**
	 * The unit scale of the .stl model. Defaults to "mm".
	 */
	sizeUnit: string;
	/**
	 * An ID pointing to a material stored in the Material Library.
	 */
	materialID: string;
}

/**
 * Potential material types:
 * - Element : A single element.
 * - Compound : A compound.
 * - Mixture: A set of elements and their proportions.
 * - HU: A set Housinfield unit.
 */
export type Material = {
	/**
	 * User-friendly label of the material
	 */
	label: string,
	/**
	 * A brief description of the material
	 */
	description: string,
	/**
	 * Density of the material [g/cm3]
	 */
	density: number;
	material: ["element" | "compound", string] | ["hu", number] | ["mixture", [string , number][]] | ["special", "air"]
}

export interface MaterialLibrary {
	[key: string]: {
		[key: string]: Material
	};
}

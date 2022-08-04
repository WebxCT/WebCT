/**
 * Types.ts : General types for dealing with reconstruction methods.
 * @author Iwan Mitchell
 */

/**
 * Supported reconstruction algorithms.
 */
export type ReconMethod = "FDK" | "FBP" | "CGLS" | "MLEM" | "SIRT"

export type ReconQuality = 0 | 1 | 2 | 3

export interface ReconstructionParams {
	quality: ReconQuality;
	readonly method: ReconMethod;
}

export interface FilteredReconstructionParams extends ReconstructionParams {
	filter: Filter
}


export type TikhonovMethod = "projection" | "identity" | "gradient"
export interface TikhonovRegulariser {
	method: TikhonovMethod
	params: {
		alpha: number,
		boundary: "Neumann" | "Periodic"
	}
}

export type ConstraintMethod = "box" | "tv"
export interface Constraint {
	method: ConstraintMethod
	params: {
		[key: string]: string | number | null | boolean
	}
}

export interface BoxConstraint extends Constraint {
	readonly method: "box"
	params: {
		lower: number|null
		upper: number|null
	}
}

export interface TVConstraint extends Constraint {
	readonly method: "tv",
	params: {
		iterations: number,
		tolerance: number,
		isotropic: boolean,
		lower: number|null,
		upper: number|null,
	}
}

type Filter = string

export interface IterativeReconstructionParams extends ReconstructionParams {
	iterations: number;
}

export class FDKParams implements FilteredReconstructionParams {
	readonly method = "FDK" as const
	quality: ReconQuality
	filter = "ram_lak"

	constructor(quality: ReconQuality, filter: Filter) {
		this.quality = quality;
		this.filter = filter;
	}
}

export class FBPParams implements FilteredReconstructionParams {
	readonly method = "FBP" as const
	quality: ReconQuality
	filter = "ram_lak"

	constructor(quality: ReconQuality, filter: Filter) {
		this.quality = quality;
		this.filter = filter;
	}
}


export class CGLSParams implements IterativeReconstructionParams {
	readonly method = "CGLS" as const
	quality: ReconQuality
	iterations: number
	tolerance: number
	operator: TikhonovRegulariser

	constructor(quality: ReconQuality, iterations: number, tolerance:number, operator: TikhonovRegulariser) {
		this.quality = quality;
		this.iterations = iterations;
		this.tolerance = tolerance;
		this.operator = operator;
	}
}

export class SIRTParams implements IterativeReconstructionParams {
	readonly method = "SIRT" as const
	quality:ReconQuality
	iterations:number
	constraint: Constraint

	constructor(quality:ReconQuality, iterations:number, constraint:Constraint) {
		this.quality = quality;
		this.iterations = iterations;
		this.constraint = constraint;
	}
}


export interface ReconstructionPreview {
	recon: {
		video:string,
		height:number,
		width:number,
	},
	slice: {
		video:string,
		height:number,
		width:number,
	},
	sino: {
		video:string,
		height:number,
		width:number,
	}
}

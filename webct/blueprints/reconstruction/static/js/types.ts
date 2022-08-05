/**
 * Types.ts : General types for dealing with reconstruction methods.
 * @author Iwan Mitchell
 */

export type ReconMethod = "FDK" | "FBP" | "CGLS" | "MLEM" | "SIRT" | "FISTA"
export type TikhonovMethod = "projection" | "identity" | "gradient"
export type ConstraintMethod = "box" | "tv" | "fgp-tv" | "tgv"
export type DiffMethod = "least-squares"

export type ReconQuality = 0 | 1 | 2 | 3

export interface ReconstructionParams {
	quality: ReconQuality;
	readonly method: ReconMethod;
}

export interface FilteredReconstructionParams extends ReconstructionParams {
	filter: Filter
}


export interface TikhonovRegulariser {
	method: TikhonovMethod
	params: {
		alpha: number,
		boundary: "Neumann" | "Periodic"
	}
}

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
		alpha: number,
		tolerance: number,
		isotropic: boolean,
		lower: number|null,
		upper: number|null,
	}
}

export interface FGPTVConstraint extends Constraint {
	readonly method: "fgp-tv"
	params: {
		iterations: number,
		alpha: number,
		tolerance: number,
		isotropic: boolean,
		nonnegativity: boolean,
	}
}

export interface TGVConstraint extends Constraint {
	readonly method: "tgv"
	params: {
		iterations: number,
		alpha: number,
		gamma: number,
		tolerance: number,
	}
}

export interface Differentiable {
	method: DiffMethod,
	params: {
		[key: string]: string | number | boolean
	}
}

export interface LeastSquaresDiff {
	readonly method: "least-squares"
	params: {
		scaling_constant: number,
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
	operator: TikhonovRegulariser

	constructor(quality:ReconQuality, iterations:number, constraint:Constraint, operator:TikhonovRegulariser) {
		this.quality = quality;
		this.iterations = iterations;
		this.constraint = constraint;
		this.operator = operator;
	}
}

export class FISTAParams implements IterativeReconstructionParams {
	readonly method = "FISTA" as const
	quality:ReconQuality
	iterations: number
	constraint: Constraint
	diff:Differentiable

	constructor(quality:ReconQuality, iterations:number, constriant:Constraint, diff:Differentiable) {
		this.quality = quality;
		this.iterations = iterations;
		this.constraint = constriant;
		this.diff = diff;
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

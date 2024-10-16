/**
 * Types.ts : General types for dealing with reconstruction methods.
 * @author Iwan Mitchell
 */

export type ReconMethod = "FDK" | "FBP" | "CGLS" | "MLEM" | "SIRT" | "FISTA"
export type TikhonovMethod = "projection" | "identity" | "gradient"
export type ProximalMethod = "box" | "tv" | "fgp-tv" | "tgv"
export type DiffMethod = "least-squares"

export interface ReconstructionParams {
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

export interface Proximal {
	method: ProximalMethod
	params: {
		[key: string]: string | number | null | boolean
	}
}

export interface BoxProximal extends Proximal {
	readonly method: "box"
	params: {
		lower: number|null
		upper: number|null
	}
}

export interface TVProximal extends Proximal {
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

export interface FGPTVProximal extends Proximal {
	readonly method: "fgp-tv"
	params: {
		iterations: number,
		alpha: number,
		tolerance: number,
		isotropic: boolean,
		nonnegativity: boolean,
	}
}

export interface TGVProximal extends Proximal {
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
	filter = "ram_lak"

	constructor(filter: Filter) {
		this.filter = filter;
	}
}

export class FBPParams implements FilteredReconstructionParams {
	readonly method = "FBP" as const
	filter = "ram_lak"

	constructor(filter: Filter) {
		this.filter = filter;
	}
}


export class CGLSParams implements IterativeReconstructionParams {
	readonly method = "CGLS" as const
	iterations: number
	tolerance: number
	operator: TikhonovRegulariser

	constructor(iterations: number, tolerance:number, operator: TikhonovRegulariser) {
		this.iterations = iterations;
		this.tolerance = tolerance;
		this.operator = operator;
	}
}

export class SIRTParams implements IterativeReconstructionParams {
	readonly method = "SIRT" as const
	iterations:number
	constraint: Proximal
	operator: TikhonovRegulariser

	constructor(iterations:number, constraint:Proximal, operator:TikhonovRegulariser) {
		this.iterations = iterations;
		this.constraint = constraint;
		this.operator = operator;
	}
}

export class FISTAParams implements IterativeReconstructionParams {
	readonly method = "FISTA" as const
	iterations: number
	constraint: Proximal
	diff:Differentiable

	constructor(iterations:number, constriant:Proximal, diff:Differentiable) {
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
	},
	centreSlice: {
		image:string,
		height:number,
		width:number,
	}
}

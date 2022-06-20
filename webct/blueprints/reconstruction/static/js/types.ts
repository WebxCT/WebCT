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

export type CGLSVariant = "" | "conv" | "tik" | "tv"

export class CGLSParams implements IterativeReconstructionParams {
	readonly method = "CGLS" as const
	quality: ReconQuality
	iterations: number
	variant: CGLSVariant

	constructor(quality: ReconQuality, iterations: number, variant: CGLSVariant) {
		this.quality = quality;
		this.iterations = iterations;
		this.variant = variant;
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

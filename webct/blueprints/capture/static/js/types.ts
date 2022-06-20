/**
 * Types.ts : General types when dealing with X-Ray Tubes and Beams.
 * @author Iwan Mitchell
 */


/**
 * X-Ray Beam Properties. Includes Tube properties and filters.
 */
export interface CaptureProperties {
	/**
	 * Number of equally spaced projections.
	 */
	numProjections: number;
	/**
	 * Total angle of the scan in degrees (180 or 360)
	 */
	totalAngle: number;
	/**
	 * Detector Position relative to sample origin
	 */
	detectorPosition: [number, number, number];
	/**
	 * Beam Position relative to sample origin
	 */
	beamPosition: [number, number, number];
	/**
	 * Rotation of sample in degrees.
	 */
	sampleRotation: [number, number, number];
}

export interface CapturePreview {
	gifString:string;
	height:number;
	width:number;
}

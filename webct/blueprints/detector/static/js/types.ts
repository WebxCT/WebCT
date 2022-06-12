/**
 * Types.ts : General types when dealing with X-Ray Detectors.
 * @author Iwan Mitchell
 */

/**
 * X-Ray detector properties.
 */
export interface DetectorProperties {
	/**
	 * Detector pane width [mm]
	 */
	paneWidth: number;
	/**
	 * Detector pane height [mm]
	 */
	paneHeight: number;
	/**
	 * Pixel width and height [mm]
	 */
	pixelSize: number;
}

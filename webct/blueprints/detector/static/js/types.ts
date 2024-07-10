/**
 * Types.ts : General types when dealing with X-Ray Detectors.
 * @author Iwan Mitchell
 */

import { colors } from "../../../base/static/js/colors";
import { ChartOptions } from "chart.js";
import { Chart } from "chart.js";
//! Chart.js elements must already be registered with Chart.register(...registerables)


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

	/**
	 * Detector Scintillator for energy response
	 */
	scintillator:Scintillator;

	/**
	 * Line spread Function to replicate Optical Transfer Function of detector
	 */
	lsf:LSF;
}

export type ScintillatorMaterial = "" | "CUSTOM" | "CsI" | "NaI" | "Gadox" | "Gadox DRZ-Plus" | "Gd2O3" | "Gd3Ga5O12" | "YGO" | "CdWO4" | "Y2O3" | "La2HfO7" | "Y3Al5O12"

export interface Scintillator {
	/**
	 * Scintillator crystal material
	 */
	material: ScintillatorMaterial;
	/**
	 * Scintillator Thickness [mm]
	 */
	thickness: number;
}


export class LSF {
	pixels: Array<number>;

	values: Array<number>;

	constructor(values:Array<number>) {
		this.values = values;

		// Construct pixel list from values

		const end = Math.floor(values.length / 2);
		const start = end * -1;
		this.pixels = [...Array(end - start + 1).keys()].map(x => x + start);
	}

	static from_text(text:string): LSFParseResult {

		// Text parsing, woooo....
		if (text[0] === "[") {
			if (text[text.length] !== "]") {
				return {status:LSFParseEnum.FAIL};
			}

			text = text.substring(1, text.length-1);
		}

		// split on , and parse each float

		const txtvalues = text.split(",");
		console.log(txtvalues);

		const values = new Array<number>();

		for (let index = 0; index < txtvalues.length; index++) {
			const value = txtvalues[index];
			const pval = parseFloat(value);
			if (typeof pval !== "number" || !isFinite(pval)) {
				return {status: LSFParseEnum.FAIL};
			}
			values.push(pval);
		}
		console.log(values);

		// Normalise values so area under curve == 1
		const total: number = values.reduce((previousValue:number, currentValue:number) => {
			return previousValue + currentValue;
		});

		console.log("-----");
		console.log(values);
		console.log(total);
		for (let index = 0; index < values.length; index++) {
			const element = values[index];
			values[index] = element / 1 / total;
		}
		console.log(values);
		console.log("-----");


		return {lsf:new LSF(values), status: LSFParseEnum.SUCCESS};
	}
}

export enum LSFParseEnum {
	SUCCESS,
	FAIL
}

export interface LSFParseResult {
	lsf?:LSF
	status:LSFParseEnum
}

export class LSFDisplay {
	readonly lsf: LSF
	readonly canvas: HTMLCanvasElement

	_chart?: Chart

	constructor(lsf:LSF, canvas:HTMLCanvasElement) {
		this.lsf = lsf;
		this.canvas = canvas;

		// Obtain a chart item if it already exists on the given canvas
		if (Chart.getChart(this.canvas) !== undefined) {
			this._chart = Chart.getChart(this.canvas);
		}
	}


	public displayLSF(): void {

		const chartOptions: ChartOptions = {
			responsive: true,
			maintainAspectRatio: false,
			devicePixelRatio: 1.5,
			interaction: {
				mode: "index",
				intersect: false,
			},
			scales: {
				x: {
					axis: "x",
					display: true,
					ticks: {
						display: true
					},
					title: {
						display: true,
						text: "Pixels",
					},
				},
				y: {
					axis: "y",
					display: true,
					suggestedMin: 0,
					ticks: {
						display: true,
					},
					title: {
						display: false,
						text: ""
					},
				},
			},
			plugins: {
				title: {
					display: true,
					text: "Line Spread Function"
				},
				legend: {
					display: false
				}
			}
		};

		// ? Unknown type for dealing with chart.js dataset configurations
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		const LSFLineSettings: any = {
			label: "LSF",
			backgroundColor: colors["blue-500"],
			borderColor: colors["blue-500"],
			cubicInterpolationMode: "monotone",
			fill: false,
			radius: 0,
			data: this.lsf.values,
		};

		this._chart?.destroy();

		this._chart = new Chart(this.canvas, {
			type: "line",
			data: {
				labels: this.lsf.pixels,
				datasets: [LSFLineSettings],
			},
			options: chartOptions
		});

		this._chart.update();

	}
}

/**
 * Energy Response Curve
 */
export interface EnergyResponseData {
	/**
	 * Photon energies (mid-bin) [keV]
	 */
	incident: Array<number>;
	/**
	 * Photon energy spectrum [Normalised]
	 */
	output: Array<number>;
}

/**
 * Spectra display class linked to spectra data and a canvas.
 */
export class EnergyResponseDisplay {
	readonly energyResponse: EnergyResponseData
	readonly canvas: HTMLCanvasElement
	readonly detector: DetectorProperties
	_chart?: Chart;

	constructor(energyResponse: EnergyResponseData, detector: DetectorProperties, canvas: HTMLCanvasElement) {
		this.energyResponse = energyResponse;
		this.canvas = canvas;
		this.detector = detector;

		// Obtain a chart item if it already exists on the given canvas.
		if (Chart.getChart(this.canvas) !== undefined) {
			this._chart = Chart.getChart(this.canvas);
		}
	}

	public displayEnergyResponse(): void {

		let title = "Energy Response for " + (this.detector.scintillator.thickness * 1000) + "μm " + this.detector.scintillator.material;
		let label = this.detector.scintillator.material + "";
		let borderDash = undefined;

		if (this.detector.scintillator.material == "") {
			title = "Perfect Energy Response";
			label = "Perfect Response";
			borderDash = [10,5];
		}

		const chartOptions: ChartOptions = {
			responsive: true,
			maintainAspectRatio: false,
			interaction: {
				mode: "index",
				intersect: false,
			},
			scales: {
				x: {
					axis: "x",
					type: "linear",
					display: true,
					ticks: {
						display: true,
						precision: 0,
					},
					title: {
						display: true,
						text: "Incident Energy (keV)",
					},
					suggestedMin: 0,
					max: 300
				},
				y: {
					axis: "y",
					type: "linear",
					display: true,
					suggestedMin: 0,
					ticks: {
						display: true,
						precision: 0
					},
					title: {
						display: true,
						text: "Response Energy (keV)"
					},
				},
			},
			plugins: {
				title: {
					display: true,
					text: title
				},
				tooltip: {
					callbacks: {
						label: (tooltipItem) => {
							return tooltipItem.dataset.label + ": " + tooltipItem.parsed.y.toFixed(2) + "keV"
						},
						title: (tooltipItems) => {
							return "Incident " + tooltipItems[0].parsed.x.toFixed(2) + "keV"
						},
					}
				}
			}
		};

		// ? Unknown type for dealing with chart.js dataset configurations
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		const ResponseLineSettings: any = {
			label: label,
			backgroundColor: colors["blue-500"],
			borderColor: colors["blue-500"],
			cubicInterpolationMode: "monotone",
			borderDash: borderDash,
			fill: false,
			radius: 0,
			data: this.energyResponse.output,
		};

		this._chart?.destroy();

		this._chart = new Chart(this.canvas, {
			type: "line",
			data: {
				labels: this.energyResponse.incident,
				datasets: [ResponseLineSettings],
			},
			options: chartOptions
		});

		this._chart.update();
	}
}

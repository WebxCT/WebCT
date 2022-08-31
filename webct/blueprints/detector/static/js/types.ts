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

	lsf:LSF;
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

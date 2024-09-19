import { ChartOptions } from "chart.js";
import { Chart } from "chart.js";
import { colors } from "../../../../base/static/js/colors";
//! Chart.js elements must already be registered with Chart.register(...registerables)

export interface PreviewData {
	time:number,
	projection: {
		image: {
			raw:string,
			log:string,
		},
		height:number,
		width:number,
		transmission: {
			hist:number[],
			image:string
		}
	},
	layout: {
		image:string,
		height:number,
		width:number
	},
	scene:{
		image:string,
		height:number,
		width:number
	}
}

/**
 * Spectra display class linked to spectra data and a canvas.
 */
export class TransmissionDisplay {
	readonly previewData: PreviewData
	readonly canvas: HTMLCanvasElement
	_chart?: Chart;

	constructor(previewData: PreviewData, canvas: HTMLCanvasElement) {
		this.previewData = previewData;
		this.canvas = canvas;

		// Obtain a chart item if it already exists on the given canvas.
		if (Chart.getChart(this.canvas) !== undefined) {
			this._chart = Chart.getChart(this.canvas);
		}
	}

	public displayTransmission(): void {

		let title = "Image Transmission";
		let label = "Transmission";

		const chartOptions: ChartOptions = {
			indexAxis: 'y',
			responsive: true,
			maintainAspectRatio: false,
			scales: {
				y: {
					// afterBuildTicks: axis => axis.ticks = [0.0, 5.0, 100.0].map(v => ({ value: v })),
					beginAtZero: true,
					ticks: {
						display: true,
						callback: (tickValue, index, ticks) => {
							return parseInt(tickValue + "") + "%";
						},
					},
					grid: {
						display: true,
						drawTicks: false,
					},
					title: {
						display: true,
						text: "Transmission (%)",
					},
				},
				x: {
					ticks: {
						display: true,
						callback: (tickValue, index, ticks) => {
							return parseFloat(tickValue + "").toFixed(2) + "%";
						},
					},
					grid: {
						display: true,
					},
					title: {
						display: true,
						text: "Image Percentage",
					},
				}
			},
			plugins: {
				title: {
					display: true,
					text: title
				},
				legend: {
					display: false,
				},
				tooltip: {
					callbacks: {
						// label: (tooltipItem) => {
						// 	return tooltipItem.dataset.label + ": " + tooltipItem.parsed.y.toFixed(2) + "keV"
						// },
						title: (tooltipItems) => {
							return tooltipItems[0].parsed.y.toFixed(0) + "% Transmission: " + tooltipItems[0].parsed.x.toFixed(2) + "% of pixels.";
						},
					}
				}
			}
		};


		var barcolors = [colors["red-500"]];
		barcolors.length = this.previewData.projection.transmission.hist.length
		barcolors = barcolors.fill(colors["grey-500"], 0, barcolors.length)
		barcolors = barcolors.fill(colors["red-500"], 0, 6)

		// ? Unknown type for dealing with chart.js dataset configurations
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		const TransmissionSettings: any = {
			label: label,
			backgroundColor: barcolors,
			borderColor: barcolors,
			barPercentage: 1,
			cubicInterpolationMode: "monotone",
			borderDash: undefined,
			fill: false,
			radius: 0,
			data: this.previewData.projection.transmission.hist,
		};

		this._chart?.destroy();

		this._chart = new Chart(this.canvas, {
			type: "bar",
			data: {
				labels: this.previewData.projection.transmission.hist,
				datasets: [TransmissionSettings],
			},
			options: chartOptions
		});

		this._chart.update();
	}
}

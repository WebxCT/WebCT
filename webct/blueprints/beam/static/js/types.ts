/**
 * Types.ts : General types when dealing with X-Ray Tubes and Beams.
 * @author Iwan Mitchell
 */
import { colors } from "../../../base/static/js/colors";
import { ElementNames } from "../../../base/static/js/elements";
import { Element } from "../../../base/static/js/types";
import { ChartOptions } from "chart.js";
import { Chart, registerables } from "chart.js";
Chart.register(...registerables);

/**
 * Energy spectra emitted by a X-Ray beam.
 */
export interface SpectraData {
	/**
	 * Photon energies (mid-bin) [keV]
	 */
	energies: Array<number>;
	/**
	 * Photon energy spectrum [Normalised]
	 */
	photons: Array<number>;
	/**
	 * Air Kerma calculated from spectrum [uGy]
	 */
	kerma: number;
	/**
	 * Fluence of spectrum [Photons cm^-2 mAs^-1]
	 */
	flu: number;
	/**
	 * Mean energy of spectrum [keV]
	 */
	emean: number;
}

/**
 * Single-element filters used in X-Ray Beam generation.
 */
export interface Filter {
	/**
	 * Material of the filter
	 */
	material: Element,
	/**
	 * Thickness of the material [mm]
	 */
	thickness: number;
}

/**
 * X-Ray Beam Properties. Includes Tube properties and filters.
 */
export interface BeamProperties {
	/**
	 * Voltage of the X-Ray Tube [KeV]
	 */
	tubeVoltage: number;
	/**
	 * Emission angle of the X-Ray Tube [Degrees]
	 */
	emissionAngle: number,
	/**
	 * X-Ray Tube Anode Material
	 */
	sourceMaterial: Element;
	/**
	 * Filters applied to the resultant beam after generation
	 */
	filters: Array<Filter>;
	/**
	 * Spectra generation method
	 */
	beamGenerator:string
	/**
	 * Parallel or point beam
	 */
	beamProjection:string
}

export type ViewFormat = "None" | "0-1 Normalisation" | "Percentage"
const spectraUnits = new Map<ViewFormat, string>([
	["None", "Photons cm^-2 keV^-1"],
	["0-1 Normalisation", "Normalised Value"],
	["Percentage", "Percentage Energy"]
]);

/**
 * Spectra display class linked to spectra data and a canvas.
 */
export class SpectraDisplay {
	readonly filteredSpectra: SpectraData
	readonly unfilteredSpectra: SpectraData
	readonly canvas: HTMLCanvasElement
	readonly beam: BeamProperties
	_chart?: Chart;
	_viewFormat: ViewFormat;


	public get viewFormat(): ViewFormat {
		return this._viewFormat;
	}


	public set viewFormat(v: ViewFormat) {
		this._viewFormat = v;
		this.displaySpectra();
	}

	constructor(filteredSpectra: SpectraData, unfilteredSpectra: SpectraData, beam: BeamProperties, canvas: HTMLCanvasElement, format: ViewFormat) {
		this.filteredSpectra = filteredSpectra;
		this.unfilteredSpectra = unfilteredSpectra;
		this.canvas = canvas;
		this.beam = beam;

		// Obtain a chart item if it already exists on the given canvas.
		if (Chart.getChart(this.canvas) !== undefined) {
			this._chart = Chart.getChart(this.canvas);
		}

		// setting viewFormat will populate the canvas with a chart
		this.viewFormat = format;

		// Workaround for --strictPropertyInitialization
		this._viewFormat = format;
	}

	/**
	 * Plot beam spectra data to a canvas
	 * @param canvas - Canvas to render spectra to
	 * @param beamProperties - Beam properties
	 * @param spectraData - Spectra data to plot
	 */
	public displaySpectra(): void {

		const filter = this.normaliseSpectra(this.filteredSpectra.photons, this.viewFormat);
		const unfilter = this.normaliseSpectra(this.unfilteredSpectra.photons, this.viewFormat);

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
					display: true,
					ticks: {
						display: true
					},
					title: {
						display: true,
						text: "Energy (keV)",
					},
					suggestedMin: 0
				},
				y: {
					axis: "y",
					display: true,
					suggestedMin: 0,
					ticks: {
						display: true,
					},
					title: {
						display: true,
						text: spectraUnits.get(this.viewFormat)
					},
				},
			},
			plugins: {
				title: {
					display: true,
					text: ElementNames[this.beam.sourceMaterial] + " beam @ " + this.beam.tubeVoltage + "kV"
				}
			}
		};

		// ? Unknown type for dealing with chart.js dataset configurations
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		const FilteredLineSettings: any = {
			label: "Filtered",
			backgroundColor: colors["blue-500"],
			borderColor: colors["blue-500"],
			cubicInterpolationMode: "monotone",
			fill: false,
			radius: 0,
			data: filter,
		};

		// ? Unknown type for dealing with chart.js dataset configurations
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		const UnfilteredLineSettings: any = {
			label: "Unfiltered",
			backgroundColor: colors["red-500"],
			borderColor: colors["red-500"],
			cubicInterpolationMode: "monotone",
			fill: false,
			radius: 0,
			data: unfilter,
		};

		const filterVisible = this._chart?.isDatasetVisible(0);
		const unfilterVisible = this._chart?.isDatasetVisible(1);

		this._chart?.destroy();

		this._chart = new Chart(this.canvas, {
			type: "line",
			data: {
				labels: this.filteredSpectra.energies,
				datasets: [FilteredLineSettings, UnfilteredLineSettings],
			},
			options: chartOptions
		});

		this._chart.update();
		console.log(filter);
		console.log(unfilter);


		if (filterVisible !== undefined && unfilterVisible !== undefined) {
			this._chart?.setDatasetVisibility(0, filterVisible);
			this._chart?.setDatasetVisibility(1, unfilterVisible);
			this._chart?.update();
		}
	}

	private normaliseSpectra(spectra: number[], format: ViewFormat): number[] {
		const max: number = Math.max(...spectra);
		const min: number = Math.min(...spectra);
		const total: number = spectra.reduce((previousValue:number, currentValue:number) => {
			return previousValue + currentValue;
		});

		switch (format) {
		case "0-1 Normalisation":
			return spectra.map((value: number) => {
				return (value - min) / (max - min);
			});
		case "Percentage":
			return spectra.map((value: number) => {
				return (value / total) * 100;
			});
		default:
			return spectra;
		}
	}
}

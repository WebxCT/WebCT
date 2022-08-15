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

export type SourceType = "lab" | "synch" | "med"

export type BeamGenerator = "spekpy" | "xpecgen"

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


export interface BeamProperties {
	method: SourceType;
	/**
	 * Filters applied to the resultant beam after generation
	 */
	filters: Array<Filter>;
}

interface TubeBeam {
	voltage: number;
	spotSize: number;
	material:number;
	anodeAngle: number;
	generator: BeamGenerator;
}

export class LabBeam implements BeamProperties, TubeBeam {
	method = "lab" as const

	voltage: number

	exposure: number

	intensity: number

	filters: Array<Filter>

	spotSize: number;

	material:number;

	anodeAngle: number;

	generator: BeamGenerator;

	constructor(voltage: number, exposure:number, intensity:number, spotSize:number, material:number,generator:BeamGenerator, anodeAngle:number, filters:Array<Filter>) {
		this.voltage = voltage;
		this.exposure = exposure;
		this.intensity = intensity;
		this.spotSize = spotSize;
		this.material = material;
		this.anodeAngle = anodeAngle;
		this.generator = generator;
		this.filters = filters;
	}
}

export class SynchBeam implements BeamProperties {
	method = "synch" as const
	energy: number
	exposure: number
	intensity: number
	harmonics:boolean
	filters: Array<Filter>

	constructor(energy:number, exposure:number, intensity:number, harmonics:boolean, filters:Array<Filter>) {
		this.energy = energy;
		this.exposure = exposure,
		this.intensity = intensity;
		this.harmonics = harmonics;
		this.filters = filters;
	}
}

export class MedBeam implements BeamProperties, TubeBeam {
	method = "med" as const
	voltage: number
	mas: number
	filters: Array<Filter>
	spotSize: number;
	material:number;
	anodeAngle: number;
	generator: BeamGenerator;

	constructor(voltage: number, mas:number, spotSize:number, material:number,generator:BeamGenerator, anodeAngle:number, filters:Array<Filter>) {
		this.voltage = voltage;
		this.mas = mas;
		this.spotSize = spotSize;
		this.material = material;
		this.generator = generator;
		this.anodeAngle = anodeAngle;
		this.filters = filters;
	}
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

		let title:string;
		let prop;
		switch (this.beam.method) {
		case "lab":
			prop = this.beam as LabBeam;
			title = ElementNames[prop.material] + " beam @ " + prop.voltage + "kV";
			break;
		case "med":
			prop = this.beam as MedBeam;
			title = prop.voltage + "kV beam @ " + prop.mas + "mAs";
			break;
		case "synch":
			prop = this.beam as SynchBeam;
			title = prop.energy + "keV beam @ " + prop.intensity + "mA";
			break;
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
					text: title
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

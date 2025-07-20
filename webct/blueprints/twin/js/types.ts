// oxlint-disable id-length

import type { EmissionShape } from "../../beam/static/js/types"

export interface DigitalTwin {

    // User-facing Metainfo
    name: string
    facility: string
    description: string
    date: string

    beams: Record<string, TwinBeamMonochromatic | TwinBeamTube | TwinBeamFixedSpectrum>
    detector: TwinDetector
    stage: TwinStage

}

type TwinBeamType = "monochromatic" | "tube" | "fixed-spectrum"

interface TwinBeam {
	beam_type: TwinBeamType,
    shape: EmissionShape,
}

interface TwinFlux {
    curve: number[]
    distance: number
}

interface TwinBeamMonochromatic extends TwinBeam {
    beam_type: "monochromatic"
    keV: [number, | number],
    flux: TwinFlux
}

interface TwinBeamTube extends TwinBeam {
    beam_type: "tube"
    keV: [number, number],
    uA: [number, number],
    flux : TwinFlux
}

export interface TwinBeamFixedSpectrum extends TwinBeam {
    beam_type: "fixed-spectrum"
	spectrum: [number, number][]

    filters: [string | number][][]
}

interface TwinStage {
    source: XYZRange
    detector: XYZRange
    fixedSourceDetectorDistance: boolean
}

interface TwinDetector {
    exposures: number[]
    resolutions: [number, number][]
    pixelPitch: number,
    lsf: number[]
    scintillator: TwinScintillator
    gain: TwinGain
}

interface TwinScintillator {
    material: string
    thickness: number,
    energyResponse: [number, number][]
}

interface TwinGain {
    k: number
    gains: number[]
}

interface XYZRange {
    x: [number, number, number?]
    y: [number, number, number?]
    z: [number, number, number?]
}

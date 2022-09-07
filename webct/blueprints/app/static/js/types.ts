import { BeamProperties } from "../../../beam/static/js/types";
import { CaptureProperties } from "../../../capture/static/js/types";
import { DetectorProperties } from "../../../detector/static/js/types";
import { ReconstructionParams } from "../../../reconstruction/static/js/types";
import { SampleProperties } from "../../../samples/static/js/types";

export interface WebCTConfig {
	Beam:BeamProperties;
	Detector:DetectorProperties;
	Capture:CaptureProperties;
	Reconstruction:ReconstructionParams;
	Samples:SampleProperties[];
}

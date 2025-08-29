import { PopulateTwinList, SetBeamTwin } from "../../../beam/static/js/beam";
import { setCaptureTwin } from "../../../capture/static/js/capture";
import { SetDetectorTwin } from "../../../detector/static/js/detector";
import { listDigitalTwins } from "./api";
import { DigitalTwin } from "./types"


export let TWIN_LIST:Record<string, DigitalTwin | null> = {"none": null}
export let TWIN:DigitalTwin | null = null;

export function UpdateTwinList(): Promise<void> {

	return listDigitalTwins().then((response: Response) => {
		console.log("Digital Twin Response Status:" + response.status);
		if (response.status == 500) {
			console.log("Unexpecteed error when enumerating twins from server");
			return;
		}

		// Convert to json
		const result = response.json();

		result.then((result: Record<string, DigitalTwin>) => {
			TWIN_LIST = result

			// Enforce the case of none as an option
			TWIN_LIST["none"] = null

			// Update list of digital twins on the beam page
			PopulateTwinList();

		}).catch(() => {
			console.log("Unable to parse digital twin response");
		});
	}).catch(() => {
		console.log("Failed to request digital twins");
	});
}

export function SetTwin(twin:string): boolean {
	if (!Object.prototype.hasOwnProperty.call(TWIN_LIST, twin)) {
		return false;
	}
	TWIN = TWIN_LIST[twin]

	SetBeamTwin(TWIN)
	SetDetectorTwin(TWIN)
	setCaptureTwin(TWIN)

	return true;
}

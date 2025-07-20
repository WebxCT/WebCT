import { DigitalTwin } from "./types"


export let TWIN_LIST:Record<string, DigitalTwin | null> = {"none": null}
export let TWIN:DigitalTwin | null = null;

export function updateTwinList() {
	TWIN_LIST
}

export function SelectTwin(twin:string) {
}

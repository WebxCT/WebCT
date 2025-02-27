// export * from "@shoelace-style/shoelace";

import { SlButton, SlProgressBar } from "@shoelace-style/shoelace";
import { setupBeam, spectraNormPercentButton, SyncBeam, UpdateBeam } from "../../../beam/static/js/beam";
import { getCaptureParams, setupCapture, SyncCapture, UpdateCapture, UpdateCapturePreview } from "../../../capture/static/js/capture";
import { setupDetector, SyncDetector, UpdateDetector } from "../../../detector/static/js/detector";
import { MarkLoading, PreviewData, setupPreview, updateProjection } from "../../../preview/static/js/sim/projection";
import { setupRecon, SyncRecon, UpdateRecon, UpdateReconPreview as UpdateReconPreview } from "../../../reconstruction/static/js/recon";
import { setupSamples, SyncSamples, UpdateSamples } from "../../../samples/static/js/samples";
import { setupConfig } from "./configuration";
import { setupDownload, UpdateStats } from "./download";

let UpdateButtons: HTMLCollectionOf<SlButton>;
let CaptureButtons: HTMLCollectionOf<SlButton>;
let ReconButtons: HTMLCollectionOf<SlButton>;
let LoadingBar: SlProgressBar;

type LongLoadingSource = "Recon"|"Capture"|"Download"|"";

let LongLoadingCaller: LongLoadingSource;

function bindGroupButtons() {
	const groups = document.getElementsByClassName("group");

	// Loop through each element with the group class
	for (let index = 0; index < groups.length; index++) {
		const div = groups[index];
		if (div instanceof HTMLDivElement) {
			// Group element is a div
			for (let index = 0; index < div.childNodes.length; index++) {
				const button = div.childNodes[index];
				if (button instanceof HTMLButtonElement) {
					// Button inside group div

					// set dropdown arrow (makes the html easier)
					button.innerHTML = "<sl-icon name=\"chevron-compact-down\"></sl-icon>";
					button.onclick = () => {
						div.toggleAttribute("active");
						button.innerHTML = "<sl-icon name=\"chevron-compact-down\"></sl-icon>";
						if (div.attributes.getNamedItem("active")) {;
							button.innerHTML = "<sl-icon name=\"chevron-compact-up\"></sl-icon>";
						}
					};
				}
			}
		}
	}
}

function bindTabButtons() {
	const imagebar = document.getElementById("imagebar");

	if (imagebar == null) {
		console.error("Unable to find #imagebar");
		return;
	}

	const buttons = imagebar.querySelectorAll("sl-button");

	for (let index = 0; index < buttons.length; index++) {
		// pretend button is a button
		const button = buttons[index] as SlButton;
		if (button.nodeName == "SL-BUTTON") {
			// button is now sure to be a button
			button.onclick = () => {
				// Get target
				const buttonTarget: string | null = button.getAttribute("target");
				if (buttonTarget == null) {
					console.error("Imagebar button has no target");
					return;
				}

				// Get tab from target
				const newTab = document.querySelector("aside#sidebar > section.tab[type='" + buttonTarget + "']");
				if (newTab == null) {
					console.error("Unable to find a tab with the type '" + buttonTarget + "'");
					return;
				}

				// Get pane from target
				const newPane = document.querySelector("section.pane[type='" + buttonTarget + "']");
				if (newPane == null) {
					console.error("Unable to find a pane with the type '" + buttonTarget + "'");
					return;
				}

				// Set active tab as inactive
				document.querySelector("aside#sidebar > section.tab[active]")?.removeAttribute("active");
				document.querySelector("section.pane[active]")?.removeAttribute("active");

				// Set new tab as active
				newTab.setAttribute("active", "");
				newPane.setAttribute("active", "");

				// Change button type
				imagebar.querySelector("sl-button[type='primary']")?.removeAttribute("type");

				// Set new button
				button.setAttribute("type", "primary");

			};
		}
	}
}

function bindUpdateButtons(): void {
	UpdateButtons = document.getElementsByClassName("button-update") as HTMLCollectionOf<SlButton>;
	console.log(UpdateButtons);

	for (let index = 0; index < UpdateButtons.length; index++) {
		const button = UpdateButtons[index];
		button.onclick = UpdatePage;
	}
}

function bindCaptureButtons(): void {
	CaptureButtons = document.getElementsByClassName("button-capture") as HTMLCollectionOf<SlButton>;
	console.log(CaptureButtons);

	for (let index = 0; index < CaptureButtons.length; index++) {
		const button = CaptureButtons[index];
		button.onclick = updatePreviewCapture;
	}
}

function bindReconstructionButtons(): void {
	ReconButtons = document.getElementsByClassName("button-recon") as HTMLCollectionOf<SlButton>;
	console.log(ReconButtons);

	for (let index = 0; index < ReconButtons.length; index++) {
		const button = ReconButtons[index];
		button.onclick = updatePreviewRecon;
	}
}

function setupEvents(): void {
	window.addEventListener("stopLoading", () => {
		setPageLoading(false);
	});
	window.addEventListener("stopLoadingCapture", () => {
		setPageLoading(false, "long", "Capture");
	});
	window.addEventListener("stopLoadingRecon", () => {
		setPageLoading(false, "long", "Recon");
	});
	window.addEventListener("stopLoadingDownload", () => {
		setPageLoading(false, "long", "Download");
	});
	window.addEventListener("startLongLoading", () => {
		setPageLoading(true, "long");
	});
	window.addEventListener("startLongLoadingCapture", () => {
		setPageLoading(true, "long", "Capture");
	});
	window.addEventListener("startLongLoadingRecon", () => {
		setPageLoading(true, "long", "Recon");
	});
	window.addEventListener("startLongLoadingDownload", () => {
		setPageLoading(true, "long", "Download");
	});
	window.addEventListener("pageError", () => {
		setPageLoading(false, "error")
	});
}

function loadApp() {
	// Main UI buttons
	bindGroupButtons();
	bindTabButtons();

	// Update buttons
	bindUpdateButtons();
	bindCaptureButtons();
	bindReconstructionButtons();
	LoadingBar = document.getElementById("barLoading") as SlProgressBar;

	// Events
	setupEvents();

	// Modules
	setupConfig();
	setupBeam();
	setupDetector();
	setupPreview();
	setupSamples();
	setupCapture();
	setupRecon();

	setupDownload();

	// We do an initial update rather than a normal update in order to obtain
	// remote parameters first.
	InitialUpdate();
}

type LoadingType = "default" | "long" | "error";

// https://stackoverflow.com/questions/14226803/wait-5-seconds-before-executing-next-line
const delay = async (ms: number) => new Promise(res => setTimeout(res, ms));

function UpdateProgressTime(seconds:number, segments:number) {
	console.log("UpdateProgressTime("+seconds+")");
	LoadingBar.value = (1 / seconds)

	let delta = seconds / segments
	console.log(delta);
	setTimeout(async () => {
		for (let time = 1; time < seconds; time+=delta) {
			console.log("tik ");
			if (LongLoadingCaller == "") {
				LoadingBar.value = 100;
				return
			}
			LoadingBar.value = (time / seconds) * 100;
			console.log(LoadingBar.value);
			await delay(delta * 1000);
		}
	}, 1000);
}

let loadtime = 0

function setPageLoading(loading: boolean, type: LoadingType = "default", source: LongLoadingSource=""): void {
	if (loading) {
		loadtime = performance.now()
		console.log("## Button Loading");
		LongLoadingCaller = source;

		for (let index = 0; index < UpdateButtons.length; index++) {
			const button = UpdateButtons[index];
			button.setAttribute("loading", "true");
		}

		for (let index = 0; index < CaptureButtons.length; index++) {
			const button = CaptureButtons[index];
			button.setAttribute("loading", "true");
		}

		for (let index = 0; index < ReconButtons.length; index++) {
			const button = ReconButtons[index];
			button.setAttribute("loading", "true");
		}

		// special buttons that also update the page, but are not dedicated to that feature.
		// e.g quick-fire sample rotate buttons
		let miscButtons = document.getElementsByClassName("button-loadonupdate");
		for (let index = 0; index < miscButtons.length; index++) {
			const button = miscButtons[index];
			button.setAttribute("loading", "true")
		}

		document.getElementsByTagName("body")[0].style.cursor = "wait";

		if (source == "Capture") {
			// For all projections, we can make a guess for duration
			LoadingBar.removeAttribute("indeterminate");
			console.log(PreviewData);
			let numProj = getCaptureParams().numProjections;

			UpdateProgressTime(PreviewData.time * numProj, numProj)
		} else {
			LoadingBar.setAttribute("indeterminate", "true");
		}

		LoadingBar.setAttribute("variant", type);
		LoadingBar.removeAttribute("hidden");
	} else {
		// For better user interaction, delay transition from loading state to a
		// minimum of three seconds, even in the case of client-side validation
		// issues. This ensures the user is able to notice that the page
		// updated, but inquire as to why the projections may've not updated.

		// performance.now() returns time in [ms]
		if (performance.now() - loadtime < 2000) {
			// less than 3000ms has passed since transitioning to a loading
			// state. Therefore pause for the remainding time and a little extra
			setTimeout(() => {setPageLoading(loading, type, source)}, 2500 - (performance.now() - loadtime))
			return
		}

		// Check to see if the finish loading source supercedes the caller
		if (type != "error") {
			switch (LongLoadingCaller) {
			case "Capture":
				// Capture loading cannot be cancelled by random sources
				if (source == "") {
					return;
				}
				break;
			case "Recon":
				// Reconstruction loading has a higher priority than capture
				if (source == "" || source == "Capture") {
					return;
				}
				break;
			case "Download":
				// Download loading has the highest priority
				if (source !== "Download") {
					return;
				}
				break;
			case "":
			default:
				break;
			}
			console.log("## Finished Loading");
		} else {
			console.log("Loading interrupted due to error.");
		}

		for (let index = 0; index < UpdateButtons.length; index++) {
			const button = UpdateButtons[index];
			button.removeAttribute("loading");
		}

		for (let index = 0; index < CaptureButtons.length; index++) {
			const button = CaptureButtons[index];
			button.removeAttribute("loading");
		}

		for (let index = 0; index < ReconButtons.length; index++) {
			const button = ReconButtons[index];
			button.removeAttribute("loading");
		}

		// special buttons that also update the page, but are not dedicated to that feature.
		// e.g quick-fire sample rotate buttons
		let miscButtons = document.getElementsByClassName("button-loadonupdate");
		for (let index = 0; index < miscButtons.length; index++) {
			const button = miscButtons[index];
			button.removeAttribute("loading");
		}

		document.getElementsByTagName("body")[0].style.cursor = "";
		LoadingBar.setAttribute("hidden", "true");

		// Reset the loading caller, this may also be used by watchdogs to halt.
		LongLoadingCaller = "";
	}
}

/**
 * Initially get all parameters from the server,
 */
function InitialUpdate(): void {
	setPageLoading(true);
	MarkLoading();
	UpdateBeam()
		.then(() => UpdateDetector())
		.then(() => UpdateSamples())
		.then(() => UpdateCapture())
		.then(() => UpdateRecon())
		.then(() => updateProjection())
		.finally(() => {
			setPageLoading(false);
			spectraNormPercentButton.click();
			UpdateStats();
		});
}

export function UpdatePage(): Promise<void> {
	setPageLoading(true);
	MarkLoading();
	console.log("UpdatePage");

	return SyncBeam()
		.then(() => SyncDetector())
		.then(() => SyncSamples())
		.then(() => SyncCapture())
		.then(() => SyncRecon())
		.then(() => updateProjection())
		.finally(() => {
			setPageLoading(false);
			UpdateStats();
		});
}

function updatePreviewCapture(): void {
	UpdatePage().then(() => {
		// Due to the way things work with nested requests, we need to make an event listener
		setPageLoading(true, "long","Capture");
		UpdateCapturePreview();
	});
}

function updatePreviewRecon(): void {
	UpdatePage().then(() => {
		// Due to the way things work with nested requests, we need to make an event listener
		setPageLoading(true, "long","Recon");

		UpdateReconPreview();
		// Also generate capture preview, since recon needs to process all projections anyway.
		UpdateCapturePreview();
	});
}

// Entrypoint
window.onload = loadApp;

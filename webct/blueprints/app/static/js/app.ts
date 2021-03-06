// export * from "@shoelace-style/shoelace";

import { SlButton, SlProgressBar } from "@shoelace-style/shoelace";
import { setupBeam, SyncBeam, UpdateBeam } from "../../../beam/static/js/beam";
import { setupCapture, SyncCapture, UpdateCapture, UpdateCapturePreview } from "../../../capture/static/js/capture";
import { setupDetector, SyncDetector, UpdateDetector } from "../../../detector/static/js/detector";
import { MarkLoading, setupPreview, updateProjection } from "../../../preview/static/js/sim/projection";
import { setupRecon, SyncRecon, UpdateRecon, UpdateReconPreview as UpdateReconPreview } from "../../../reconstruction/static/js/recon";
import { setupSamples, SyncSamples, UpdateSamples } from "../../../samples/static/js/samples";
import { setupConfig } from "./configuration";

let UpdateButtons: HTMLCollectionOf<SlButton>;
let CaptureButtons: HTMLCollectionOf<SlButton>;
let ReconButtons: HTMLCollectionOf<SlButton>;
let LoadingBar:SlProgressBar;

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
					button.onclick = () => {
						div.toggleAttribute("active");
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

function setupEvents():void {
	window.addEventListener("stopLoading", () => {
		setPageLoading(false);
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

	// We do an initial update rather than a normal update in order to obtain
	// remote parameters first.
	InitialUpdate();
}

type LoadingType = "default" | "long"

function setPageLoading(loading: boolean, type:LoadingType="default"): void {
	if (loading) {
		console.log("## Button Loading");

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

		document.getElementsByTagName("body")[0].style.cursor = "wait";

		LoadingBar.setAttribute("variant", type);
		LoadingBar.removeAttribute("hidden");
	} else {
		console.log("## Finished Loading");
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

		document.getElementsByTagName("body")[0].style.cursor = "";
		LoadingBar.setAttribute("hidden", "true");
	}
}

/**
 * Initially get all parameters from the server,
 */
function InitialUpdate():void {
	setPageLoading(true);
	MarkLoading();
	UpdateBeam()
		.then(() => UpdateDetector())
		.then(() => UpdateSamples())
		.then(() => UpdateCapture())
		.then(() => UpdateRecon())
		.then(() => updateProjection())
		.finally(() => setPageLoading(false));
}

function UpdatePage(): Promise<void> {
	setPageLoading(true);
	MarkLoading();
	console.log("UpdatePage");

	return SyncBeam()
		.then(() => SyncDetector())
		.then(() => SyncSamples())
		.then(() => SyncCapture())
		.then(() => SyncRecon())
		.then(() => updateProjection())
		.finally(() => setPageLoading(false));
}

function updatePreviewCapture(): void {
	UpdatePage().then(()=>{
		// Due to the way things work with nested requests, we need to make an event listener
		setPageLoading(true, "long");
		UpdateCapturePreview();
	});
}

function updatePreviewRecon(): void {
	UpdatePage().then(()=>{
		// Due to the way things work with nested requests, we need to make an event listener
		setPageLoading(true, "long");

		UpdateReconPreview();
		// Also generate capture preview, since recon needs to process all projections anyway.
		UpdateCapturePreview();
	});
}

// Entrypoint
window.onload = loadApp;

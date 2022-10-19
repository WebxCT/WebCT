import { SlButton, SlCheckbox, SlRadio } from "@shoelace-style/shoelace";
import { processResponse, requestProjection, SimResponseRegistry } from "./api";
import { ProjectionRequestError, showError } from "./errors";
import { PreviewData } from "./types";
// import type { Buffer } from "buffer";

// ====================================================== //
// ================== Document Elements ================= //
// ====================================================== //

let ButtonPreviewProjection: SlButton;
let ButtonPreviewLayout: SlButton;
let ButtonPreviewReconstruction: SlButton;
let PreviewPane: HTMLDivElement;

let SettingRawElement: SlRadio;
let SettingLogElement: SlRadio;
let SettingInvertElement: SlCheckbox;

// ====================================================== //
// ====================================================== //
// ====================================================== //


let PreviewImages: NodeListOf<HTMLImageElement>;
let LayoutImages: NodeListOf<HTMLImageElement>;
let PreviewData: PreviewData;

export function MarkLoading(): void {
	for (let index = 0; index < PreviewImages.length; index++) {
		const image = PreviewImages[index];
		image.classList.add("updating");
		image.classList.remove("error");
	}
}

export function updateProjection(): Promise<void> {
	MarkLoading();

	return requestProjection().then((response: Response) => {
		console.log("Projection Response Status:" + response.status);

		if (response.status !== 200) {
			showError(ProjectionRequestError.UNEXPECTED_SERVER_ERROR);
			for (let index = 0; index < PreviewImages.length; index++) {
				const image = PreviewImages[index];
				image.classList.add("error");
			}
			for (let index = 0; index < LayoutImages.length; index++) {
				const image = LayoutImages[index];
				image.classList.add("error");
			}
			return;
		}
		const result = response.json();

		result.then((result: unknown) => {
			PreviewData = processResponse(result as SimResponseRegistry["simResponse"]);
			updateImageDisplay();

			for (let index = 0; index < PreviewImages.length; index++) {
				const image = PreviewImages[index];
				image.width = PreviewData.projection.width;
				image.height = PreviewData.projection.height;
				image.classList.remove("updating");
			}

			for (let index = 0; index < LayoutImages.length; index++) {
				const image = LayoutImages[index];
				image.width = PreviewData.layout.width;
				image.height = PreviewData.layout.height;
				image.classList.remove("updating");
			}
		});
	});
}

function updateImageDisplay(): void {
	for (let index = 0; index < PreviewImages.length; index++) {
		const image = PreviewImages[index];
		image.style.backgroundImage = "url('" + "data:image/png;base64," + PreviewData.projection.image + "')";

		if (SettingInvertElement.checked) {
			window.dispatchEvent(new CustomEvent("invertOn",{bubbles:true, cancelable:false}));
		} else {
			window.dispatchEvent(new CustomEvent("invertOff",{bubbles:true, cancelable:false}));
		}

		// if (!SettingInvertElement.checked) {
		// 	if (SettingLogElement.checked) {
		// 		image.style.backgroundImage = "url('" + "data:image/png;base64," + Images.imagelog.substring(2, Images.imagelog.length - 1) + "')";
		// 	} else {
		// 		image.style.backgroundImage = "url('" + "data:image/png;base64," + Images.image.substring(2, Images.image.length - 1) + "')";
		// 	}
		// } else {
		// 	if (SettingLogElement.checked) {
		// 		image.style.backgroundImage = "url('" + "data:image/png;base64," + Images.imageloginv.substring(2, Images.imageloginv.length - 1) + "')";
		// 	} else {
		// 		image.style.backgroundImage = "url('" + "data:image/png;base64," + Images.imageinv.substring(2, Images.imageinv.length - 1) + "')";
		// 	}
		// }
	}
	for (let index = 0; index < LayoutImages.length; index++) {
		const image = LayoutImages[index];
		image.style.backgroundImage = "url('" + "data:image/png;base64," + PreviewData.layout.image + "')";
	}
}

export function setupPreview(): void {
	PreviewPane = document.getElementById("previewPane") as HTMLDivElement;
	PreviewImages = document.querySelectorAll("img.image-projection") as NodeListOf<HTMLImageElement>;
	LayoutImages = document.querySelectorAll("img.image-layout") as NodeListOf<HTMLImageElement>;

	ButtonPreviewLayout = document.getElementById("buttonPreviewLayout") as SlButton;
	ButtonPreviewProjection = document.getElementById("buttonPreviewProjection") as SlButton;
	ButtonPreviewReconstruction = document.getElementById("buttonPreviewReconstruction") as SlButton;

	ButtonPreviewLayout.onclick = () => {
		ButtonPreviewLayout.variant = "primary";
		ButtonPreviewProjection.variant = "default";
		ButtonPreviewReconstruction.variant = "default";
		PreviewPane.setAttribute("selected", "layout");
		SettingsDiv.setAttribute("selected", "layout");
	};
	ButtonPreviewProjection.onclick = () => {
		ButtonPreviewLayout.variant = "default";
		ButtonPreviewProjection.variant = "primary";
		ButtonPreviewReconstruction.variant = "default";
		PreviewPane.setAttribute("selected", "projection");
		SettingsDiv.setAttribute("selected", "projection");
	};
	ButtonPreviewReconstruction.onclick = () => {
		ButtonPreviewLayout.variant = "default";
		ButtonPreviewProjection.variant = "default";
		ButtonPreviewReconstruction.variant = "primary";
		PreviewPane.setAttribute("selected", "recon");
		SettingsDiv.setAttribute("selected", "recon");
	};

	const SettingsDiv = document.getElementById("settingsPane") as HTMLDivElement;
	SettingInvertElement = document.getElementById("checkboxInvertSetting") as SlCheckbox;
	SettingInvertElement.onclick = () => {
		updateImageDisplay();
	};
	SettingRawElement = document.getElementById("radioRawProjectionSetting") as SlRadio;
	SettingRawElement.onclick = () => {
		updateImageDisplay();
	};
	SettingLogElement = document.getElementById("radioLogProjectionSetting") as SlRadio;
	SettingLogElement.onclick = () => {
		updateImageDisplay();
	};

	console.log(SettingsDiv);

	const PreviewSettingsButton = document.querySelector("#settingsPane > button") as HTMLButtonElement;
	PreviewSettingsButton.onclick = () => {
		SettingsDiv.toggleAttribute("active");
	};

	for (let index = 0; index < PreviewImages.length; index++) {
		const image = PreviewImages[index];
		window.addEventListener("invertOn", ()=> {
			image.classList.add("invert");
		});
		window.addEventListener("invertOff", ()=> {
			image.classList.remove("invert");
		});
	}

	ButtonPreviewProjection.click();
}

export function SetPreviewSize(height: number, width: number): void {
	if (PreviewImages === undefined) {
		// Catch for calling update in the detector setup before previews are ready.
		return;
	}

	for (let index = 0; index < PreviewImages.length; index++) {
		const image = PreviewImages[index];
		image.width = width;
		image.height = height;
	}
}

// ====================================================== //
// ======================= Display ====================== //
// ====================================================== //

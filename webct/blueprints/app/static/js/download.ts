import { SlButton, SlDialog, SlDropdown, SlIconButton, SlMenuItem, SlProgressBar} from "@shoelace-style/shoelace";
import { getCaptureParams, UpdateCapturePreview } from "../../../capture/static/js/capture";
import { getDetectorParams } from "../../../detector/static/js/detector";
import { UpdateReconPreview } from "../../../reconstruction/static/js/recon";
import { DownloadFormat, DownloadResource, DownloadStatus, requestStatus, sendPrepare, DownloadRequest, DownloadFormatNames, startDownload } from "./download.api";

let DownloadButton:SlIconButton;
let CloseDialogButton:SlButton;
let DownloadDialog:SlDialog;



let RadiographDownloadButton:SlButton;
let RadiographFormatDropdown:SlDropdown;
let RadiographSmall:HTMLElement;

let ProjectionsDownloadButton:SlButton;
let ProjectionsFormatDropdown:SlDropdown;
let ProjectionsSmall:HTMLElement;

let ReconCentreDownloadButton:SlButton;
let ReconCentreFormatDropdown:SlDropdown;
let ReconCentreSmall:HTMLElement;

let ReconDownloadButton:SlButton;
let ReconFormatDropdown:SlDropdown;
let ReconSmall:HTMLElement;

let StatusDownloadPanel:HTMLDivElement;
let StatusDownloadSpan:HTMLSpanElement;
let StatusDownloadBar:SlProgressBar;

let SelectedReconFormat:DownloadFormat;
let SelectedRadiographFormat:DownloadFormat;
let SelectedReconCentreFormat:DownloadFormat;
let SelectedProjectionsFormat:DownloadFormat;

export function setupDownload():boolean {
	console.log("setupDownload");

	const button_download = document.getElementById("buttonDownload");
	const button_download_close = document.getElementById("buttonDownloadClose");
	const dialog_download = document.getElementById("dialogueDownload");

	const button_download_radiograph = document.getElementById("buttonDownloadRadiograph");
	const dropdown_format_radiograph = document.getElementById("dropdownRadiographFormat");
	const small_download_radiograph = document.getElementById("smallDownloadRadiograph");

	const button_download_projections = document.getElementById("buttonDownloadProjections");
	const dropdown_format_projections = document.getElementById("dropdownProjectionsFormat");
	const small_download_projections = document.getElementById("smallDownloadProjections");

	const button_download_recon_centre = document.getElementById("buttonDownloadReconCentre");
	const dropdown_format_recon_centre = document.getElementById("dropdownReconCentreFormat");
	const small_download_recon_centre = document.getElementById("smallDownloadReconCentre");

	const button_download_recon = document.getElementById("buttonDownloadRecon");
	const dropdown_format_recon = document.getElementById("dropdownReconFormat");
	const small_download_recon = document.getElementById("smallDownloadRecon");

	const progress_download_status = document.getElementById("progressDownload");
	const panel_download_status = document.getElementById("panelDownloadStatus");
	const span_download_status = document.getElementById("spanDownloadStatus");

	if (button_download === null ||
		dialog_download == null ||
		button_download_close == null) {

		console.log(button_download);
		console.log(dialog_download);
		console.log(button_download_close);
		return false;
	}

	SelectedReconFormat = DownloadFormat.TIFF_STACK;
	SelectedRadiographFormat = DownloadFormat.TIFF_STACK;
	SelectedReconCentreFormat = DownloadFormat.TIFF_STACK;
	SelectedProjectionsFormat = DownloadFormat.TIFF_STACK;

	DownloadDialog = dialog_download as SlDialog;
	CloseDialogButton = button_download_close as SlButton;
	CloseDialogButton.onclick=()=>{
		DownloadDialog.hide();
	};

	DownloadButton = button_download as SlIconButton;
	DownloadButton.onclick=()=> {
		DownloadDialog.show();
	};

	StatusDownloadBar = progress_download_status as SlProgressBar;
	StatusDownloadPanel = panel_download_status as HTMLDivElement;
	StatusDownloadSpan = span_download_status as HTMLSpanElement;

	RadiographDownloadButton = button_download_radiograph as SlButton;
	RadiographFormatDropdown = dropdown_format_radiograph as SlDropdown;
	RadiographSmall = small_download_radiograph as HTMLElement;
	ProjectionsDownloadButton = button_download_projections as SlButton;
	ProjectionsFormatDropdown = dropdown_format_projections as SlDropdown;
	ProjectionsSmall = small_download_projections as HTMLElement;
	ReconCentreDownloadButton = button_download_recon_centre as SlButton;
	ReconCentreFormatDropdown = dropdown_format_recon_centre as SlDropdown;
	ReconCentreSmall = small_download_recon_centre as HTMLElement;
	ReconDownloadButton = button_download_recon as SlButton;
	ReconFormatDropdown = dropdown_format_recon as SlDropdown;
	ReconSmall = small_download_recon as HTMLElement;

	RadiographFormatDropdown.addEventListener("sl-select", event => {
		const item = (event as any).detail.item as SlMenuItem;
		RadiographFormatDropdown.getMenu()?.getAllItems().forEach((item) => {
			item.checked = false;
		});
		item.checked = true;
		SelectedRadiographFormat = DownloadFormat[item.value as DownloadFormat];
		let typeText = DownloadFormatNames[SelectedRadiographFormat] + "";
		if (SelectedRadiographFormat == DownloadFormat.TIFF_STACK) {
			typeText = "TIFF Image";
		}
		RadiographFormatDropdown.getElementsByTagName("sl-button")[0].textContent = "Format: "+typeText;
		UpdateStats();
	});

	ProjectionsFormatDropdown.addEventListener("sl-select", event => {
		const item = (event as any).detail.item as SlMenuItem;
		ProjectionsFormatDropdown.getMenu()?.getAllItems().forEach((item) => {
			item.checked = false;
		});
		item.checked = true;
		SelectedProjectionsFormat = DownloadFormat[item.value as DownloadFormat];
		const typeText = DownloadFormatNames[SelectedProjectionsFormat] + "";
		ProjectionsFormatDropdown.getElementsByTagName("sl-button")[0].textContent = "Format: "+typeText;
		UpdateStats();
	});

	ReconFormatDropdown.addEventListener("sl-select", event => {
		const item = (event as any).detail.item as SlMenuItem;
		ReconFormatDropdown.getMenu()?.getAllItems().forEach((item) => {
			item.checked = false;
		});
		item.checked = true;
		SelectedReconFormat = DownloadFormat[item.value as DownloadFormat];
		const typeText = DownloadFormatNames[SelectedReconFormat] + "";
		ReconFormatDropdown.getElementsByTagName("sl-button")[0].textContent = "Format: "+typeText;
		UpdateStats();
	});

	ReconCentreFormatDropdown.addEventListener("sl-select", event => {
		const item = (event as any).detail.item as SlMenuItem;
		ReconCentreFormatDropdown.getMenu()?.getAllItems().forEach((item) => {
			item.checked = false;
		});
		item.checked = true;
		SelectedReconCentreFormat = DownloadFormat[item.value as DownloadFormat];
		let typeText = DownloadFormatNames[SelectedReconCentreFormat] + "";
		if (SelectedReconCentreFormat == DownloadFormat.TIFF_STACK) {
			typeText = "TIFF Image";
		}
		ReconCentreFormatDropdown.getElementsByTagName("sl-button")[0].textContent = "Format: "+typeText;
		UpdateStats();
	});

	RadiographDownloadButton.onclick = () => {
		prepDownload({resource:DownloadResource.PROJECTION, format: SelectedRadiographFormat});
	};

	ProjectionsDownloadButton.onclick = () => {
		prepDownload({resource:DownloadResource.ALL_PROJECTION, format: SelectedProjectionsFormat});
	};

	ReconCentreDownloadButton.onclick = () => {
		prepDownload({resource:DownloadResource.RECON_SLICE, format: SelectedReconCentreFormat});
	};

	ReconDownloadButton.onclick = () => {
		prepDownload({resource:DownloadResource.RECONSTRUCTION, format: SelectedReconFormat});
	};

	UpdateStats();
	return true;
}

function prepDownload(downloadRequest:DownloadRequest) {

	window.dispatchEvent(new CustomEvent("startLongLoadingDownload", {
		bubbles: true,
		cancelable: false,
		composed: false,
	}));

	lockUI(true);
	sendPrepare(downloadRequest).then((response:Response) => {
		if (response.status == 200) {
			startDownload(downloadRequest);
		}
	}).finally(()=>{
		lockUI(false);
		window.dispatchEvent(new CustomEvent("stopLoadingDownload", {
			bubbles: true,
			cancelable: false,
			composed: false,
		}));
	});

	function GetStatus() {

		requestStatus().then((status:Response) => {
			if (status.status == 200) {
				// Download is done!
				updateDownloadStatus(DownloadStatus.DONE);
				if (downloadRequest.resource == DownloadResource.ALL_PROJECTION) {
					window.dispatchEvent(new CustomEvent("startLongLoadingCapture", {
						bubbles: true,
						cancelable: false,
						composed: false,
					}));
					UpdateCapturePreview();
				} else if (downloadRequest.resource == DownloadResource.RECONSTRUCTION || downloadRequest.resource == DownloadResource.RECON_SLICE) {
					window.dispatchEvent(new CustomEvent("startLongLoadingRecon", {
						bubbles: true,
						cancelable: false,
						composed: false,
					}));
					UpdateCapturePreview();
					UpdateReconPreview();
				}
			} else if (status.status == 425) {
				// Still processing download on backend
				const result = status.text();
				result.then((backendStatus:string) => {
					if (backendStatus == "PACKAGING") {
						updateDownloadStatus(DownloadStatus.PACKAGING);
					} else {
						updateDownloadStatus(DownloadStatus.SIMULATING);
					}
				});
				setTimeout(() => {
					GetStatus();
				}, 2000);
			} else if (status.status == 400) {
				// Download was not prepared before asking for files..
				updateDownloadStatus(DownloadStatus.ERROR);
			} else {
				// Something else broke!
				updateDownloadStatus(DownloadStatus.ERROR);
				throw new Error(status.status + ": " + status.statusText + status);
			}
		}).catch(() => {
			updateDownloadStatus(DownloadStatus.ERROR);
		});
	}
	setTimeout(() => {
		GetStatus();
	}, 400);
	updateDownloadStatus(DownloadStatus.WAITING);
}

function updateDownloadStatus(status:DownloadStatus) {
	StatusDownloadBar.classList.remove("fail");
	StatusDownloadBar.classList.remove("success");
	StatusDownloadBar.textContent = "";

	switch (status) {
	case DownloadStatus.DONE:
		StatusDownloadPanel.removeAttribute("active");
		StatusDownloadBar.value = 100;
		StatusDownloadSpan.textContent = "✅ Download Ready!";
		StatusDownloadBar.classList.add("success");
		break;
	case DownloadStatus.SIMULATING:
		StatusDownloadPanel.setAttribute("active", "");
		StatusDownloadBar.value = 25;
		StatusDownloadSpan.textContent = "Simulating...";
		break;
	case DownloadStatus.PACKAGING:
		StatusDownloadPanel.setAttribute("active", "");
		StatusDownloadBar.value = 75;
		StatusDownloadSpan.textContent = "Packaging files...";
		break;
	case DownloadStatus.WAITING:
		// Just started
		StatusDownloadPanel.setAttribute("active", "");
		StatusDownloadBar.value = 0;
		StatusDownloadSpan.textContent = "Requesting Download...";
		break;
	case DownloadStatus.ERROR:
		// Something broke...
		StatusDownloadBar.value = 100;
		StatusDownloadBar.classList.add("fail");
		StatusDownloadBar.textContent = "😢 Error During Download Preparation";
		StatusDownloadSpan.textContent = "❌ Download failed.";

		// Force show error, and delay hiding
		StatusDownloadPanel.setAttribute("active", "");
		setTimeout(() => {
			StatusDownloadPanel.removeAttribute("active");
		}, 5000);
		break;
	}
}

function lockUI(lock:boolean) {
	RadiographDownloadButton.disabled = lock;
	ProjectionsDownloadButton.disabled = lock;
	ReconDownloadButton.disabled = lock;
	ReconCentreDownloadButton.disabled = lock;
	RadiographFormatDropdown.disabled = lock;
	ProjectionsFormatDropdown.disabled = lock;
	ReconCentreFormatDropdown.disabled = lock;
	ReconFormatDropdown.disabled = lock;
}

export function UpdateStats() {
	// Single radiograph: w_px * h_px
	// All Projections: w_px * h_px * n

	// Reconstruction_Centre: w_px * w_px
	// Reconstruction: w_px * w_px * h_px

	const n = getCaptureParams().numProjections;

	const detector = getDetectorParams();
	const w_px = Math.floor(detector.paneWidth / detector.pixelSize);
	const h_px = Math.floor(detector.paneHeight / detector.pixelSize);

	const radiograph = (w_px * h_px * 4) / 1000 / 1000;
	const projections = (w_px * h_px * n * 4) / 1000 / 1000;
	const recon = (w_px * w_px * h_px * 4) / 1000 / 1000;
	const slice = (w_px * w_px * 4) / 1000 / 1000;

	RadiographDownloadButton.textContent = "Single Radiograph ("+radiograph.toFixed(2)+"MB)";
	switch (SelectedRadiographFormat) {
	case DownloadFormat.TIFF_STACK:
		RadiographSmall.textContent = "Single 32bit float .tiff ("+w_px+"x"+h_px+")";
		break;
	case DownloadFormat.JPEG:
		RadiographSmall.textContent = "Single compressed 0-255 JPEG ("+w_px+"x"+h_px+")";
		RadiographDownloadButton.textContent = "Single Radiograph ("+(radiograph/4).toFixed(2)+"MB)";
		break;
	case DownloadFormat.NUMPY:
		RadiographSmall.textContent = "Raw 32bit 2D Numpy Array ("+w_px+", "+h_px+")";
		break;
	}

	ReconCentreSmall.textContent = "Reconstruction Center Slice ("+slice.toFixed(2)+"MB)";
	switch (SelectedReconCentreFormat) {
	case DownloadFormat.TIFF_STACK:
		ReconCentreSmall.textContent = "Single 32bit float .tiff ("+w_px+"x"+w_px+")";
		break;
	case DownloadFormat.JPEG:
		ReconCentreSmall.textContent = "Single compressed 0-255 JPEG ("+w_px+"x"+w_px+")";
		ReconCentreDownloadButton.textContent = "Reconstruction Centre Slice ("+(slice/4).toFixed(2)+"MB)";
		break;
	case DownloadFormat.NUMPY:
		ReconCentreSmall.textContent = "Raw 32bit 2D Numpy Array ("+w_px+", "+w_px+")";
		break;
	}

	ProjectionsDownloadButton.textContent = "All Projections ("+projections.toFixed(2)+"MB)";
	switch (SelectedProjectionsFormat) {
	case DownloadFormat.TIFF_STACK:
		ProjectionsSmall.textContent = "Single 32bit float .tiff stack with "+n+" ("+w_px+"x"+h_px+") projections";
		break;
	case DownloadFormat.TIFF_ZIP:
		ProjectionsSmall.textContent = "Zip File containing "+n+" separate 32bit float .tiff ("+w_px+"x"+h_px+") images";
		break;
	case DownloadFormat.NUMPY:
		ProjectionsSmall.textContent = "Raw 32bit 3D Numpy Array ("+n+", "+w_px+", "+h_px+")";
		break;
	}

	ReconDownloadButton.textContent = "Full Reconstruction ("+recon.toFixed(2)+"MB)";
	switch (SelectedReconFormat) {
	case DownloadFormat.TIFF_STACK:
		ReconSmall.textContent = "Single 32bit float .tiff stack with "+h_px+" ("+w_px+"x"+w_px+") projections";
		break;
	case DownloadFormat.TIFF_ZIP:
		ReconSmall.textContent = "Zip File containing "+h_px+" separate 32bit float .tiff ("+w_px+"x"+w_px+") images";
		break;
	case DownloadFormat.NUMPY:
		ReconSmall.textContent = "Raw 32bit 3D Numpy Array ("+h_px+", "+w_px+", "+w_px+")";
		break;
	}
}

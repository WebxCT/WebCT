import { SlButton, SlCheckbox, SlDialog, SlIconButton, SlMenuItem } from "@shoelace-style/shoelace";
import { FormatLoader } from "./formats/FormatLoader";
import { GVXRConfig } from "./formats/GVXRLoader";
import { configFull, configSubset, ExportModes as ExportMode, ExportOptions, WebCTConfig } from "./types";

let ConfigButton:SlIconButton;
let CloseDialogButton:SlButton;
let ConfigDialog:SlDialog;
let JsonSettingsPanel:HTMLDivElement;
let DownloadConfigButton:SlButton;

let ModeButton: SlButton;
let ModeJson: SlMenuItem;
let ModeGVXR: SlMenuItem;
let ModeXTEK: SlMenuItem;

let BeamCheckbox: SlCheckbox;
let DetectorCheckbox: SlCheckbox;
let SampleCheckbox: SlCheckbox;
let CaptureCheckbox: SlCheckbox;
let ReconCheckbox: SlCheckbox;

let OptionMatasIDCheckbox: SlCheckbox;

let CodePreview:HTMLPreElement;

// Used for exporting to files
let ConfigContent:string;
let ConfigFormat:ExportMode;

export function setupConfig():boolean {
	const button_config = document.getElementById("buttonConfig");
	const button_config_close = document.getElementById("buttonConfigClose");
	const dialog_config = document.getElementById("dialogueConfig");
	const preview_code = document.getElementById("codePreview");
	const settings_panel_json = document.getElementById("settingsPanelJson");
	const button_config_download = document.getElementById("buttonConfigDownload");

	const button_mode = document.getElementById("buttonMode");
	const menu_mode_json = document.getElementById("menuModeJson");
	const menu_mode_gvxr = document.getElementById("menuModeGVXR");
	const menu_mode_xtek = document.getElementById("menuModeXTEK");

	const checkbox_config_beam = document.getElementById("checkboxConfigBeam");
	const checkbox_config_detector = document.getElementById("checkboxConfigDetector");
	const checkbox_config_samples = document.getElementById("checkboxConfigSamples");
	const checkbox_config_capture = document.getElementById("checkboxConfigCapture");
	const checkbox_config_recon = document.getElementById("checkboxConfigRecon");

	const checkbox_option_matasid = document.getElementById("checkboxOptMatasID");

	if (button_config === null ||
		dialog_config == null ||
		button_config_close == null ||
		preview_code == null ||
		button_mode == null ||
		settings_panel_json == null ||
		button_config_download == null ||
		menu_mode_json == null ||
		menu_mode_gvxr == null ||
		menu_mode_xtek == null ||
		checkbox_config_beam == null ||
		checkbox_config_detector == null ||
		checkbox_config_samples == null ||
		checkbox_config_capture == null ||
		checkbox_config_recon == null ||
		checkbox_option_matasid == null) {
		console.log(button_config);
		console.log(dialog_config);
		console.log(button_config_close);
		console.log(preview_code);
		console.log(settings_panel_json);
		console.log(button_config_download);

		console.log(button_mode);
		console.log(menu_mode_json);
		console.log(menu_mode_gvxr);
		console.log(menu_mode_xtek);

		console.log(checkbox_config_beam);
		console.log(checkbox_config_detector);
		console.log(checkbox_config_samples);
		console.log(checkbox_config_capture);
		console.log(checkbox_config_recon);

		console.log(checkbox_option_matasid);
		return false;
	}

	ConfigDialog = dialog_config as SlDialog;
	CloseDialogButton = button_config_close as SlButton;
	CloseDialogButton.onclick=()=>{
		ConfigDialog.hide();
	};

	JsonSettingsPanel = settings_panel_json as HTMLDivElement;
	DownloadConfigButton = button_config_download as SlButton;
	DownloadConfigButton.onclick = downloadConfig;

	ModeButton = button_mode as SlButton;
	ModeJson = menu_mode_json as SlMenuItem;
	ModeGVXR = menu_mode_gvxr as SlMenuItem;
	ModeXTEK = menu_mode_xtek as SlMenuItem;

	ModeButton.onclick = updateConfigPreview;
	ModeJson.onclick = () => {setMode(ExportMode.JSON);};
	ModeGVXR.onclick = () => {setMode(ExportMode.GVXR);};
	ModeXTEK.onclick = () => {setMode(ExportMode.XTEK);};

	BeamCheckbox = checkbox_config_beam as SlCheckbox;
	DetectorCheckbox = checkbox_config_detector as SlCheckbox;
	SampleCheckbox = checkbox_config_samples as SlCheckbox;
	CaptureCheckbox = checkbox_config_capture as SlCheckbox;
	ReconCheckbox = checkbox_config_recon as SlCheckbox;

	BeamCheckbox.addEventListener("sl-change",updateConfigPreview);
	DetectorCheckbox.addEventListener("sl-change", updateConfigPreview);
	SampleCheckbox.addEventListener("sl-change", updateConfigPreview);
	CaptureCheckbox.addEventListener("sl-change", updateConfigPreview);
	ReconCheckbox.addEventListener("sl-change", updateConfigPreview);

	OptionMatasIDCheckbox = checkbox_option_matasid as SlCheckbox;
	OptionMatasIDCheckbox.addEventListener("sl-change", updateConfigPreview);

	CodePreview = preview_code as HTMLPreElement;
	ConfigButton = button_config as SlIconButton;
	ConfigButton.onclick = () => {
		updateConfigPreview();
		ConfigDialog.show();
	};
	// hljs.highlightElement(CodePreview)

	// Set default mode
	ConfigFormat = ExportMode.JSON;
	return true;
}

function setMode(mode:ExportMode) {
	if (mode == ExportMode.XTEK) {
		return;
	}

	ModeGVXR.checked = false;
	ModeJson.checked = false;
	ModeXTEK.checked = false;

	switch (mode) {
	case ExportMode.JSON:
		ModeButton.textContent = "Format: JSON";
		ModeJson.checked = true;
		ConfigFormat = ExportMode.JSON;
		break;
	case ExportMode.GVXR:
		ModeButton.textContent = "Format: GVXR";
		ModeGVXR.checked = true;
		ConfigFormat = ExportMode.GVXR;
		break;
	// case ExportMode.XTEK:
	// 	ModeButton.textContent = "Format: XTEK";
	// 	ModeXTEK.checked = true;
	// 	ConfigFormat = ExportMode.XTEK;
	// 	break;
	}

	// Config preview will update the config to the new mode.
	updateConfigPreview();
}

function updateConfigPreview() {
	// Disable everything as needed
	BeamCheckbox.disabled = false;
	DetectorCheckbox.disabled = false;
	SampleCheckbox.disabled = false;
	CaptureCheckbox.disabled = false;
	ReconCheckbox.disabled = false;
	JsonSettingsPanel.classList.add("hidden");

	// Call independent mode update functions
	let config:FormatLoader|configSubset;
	switch (ConfigFormat) {
	case ExportMode.JSON:
		config = updateJsonConfig();
		break;
	case ExportMode.GVXR:
		config = updateGvxrConfig();
		break;
	case ExportMode.XTEK:
		config = updateXtekConfig();
		break;
	}

	// Remove selected parts from the export
	setExportContent(JSON.stringify(config, undefined, 4));
}


function updateJsonConfig() {

	// Enumerate options
	const options:ExportOptions[] = [];

	const optionKeys:[SlCheckbox, ExportOptions][] = [
		[OptionMatasIDCheckbox, ExportOptions.MatasId],
	];

	for (let index = 0; index < optionKeys.length; index++) {
		const [checkbox, option] = optionKeys[index];
		if (checkbox.checked) {
			options.push(option);
		}
	}

	// Visual: Disable options based on enabled elements
	OptionMatasIDCheckbox.disabled = !SampleCheckbox.checked;
	JsonSettingsPanel.classList.remove("hidden");

	// Return config
	return WebCTConfig.to_json({
		beam: BeamCheckbox.checked,
		detector: DetectorCheckbox.checked,
		samples:SampleCheckbox.checked,
		capture: CaptureCheckbox.checked,
		recon:ReconCheckbox.checked
	}, options);
}

function updateGvxrConfig() {

	BeamCheckbox.disabled = true;
	BeamCheckbox.checked = true;
	DetectorCheckbox.disabled = true;
	DetectorCheckbox.checked = true;
	SampleCheckbox.checked = true;
	SampleCheckbox.disabled = true;
	CaptureCheckbox.checked = true;
	CaptureCheckbox.disabled = true;
	ReconCheckbox.checked = false;
	ReconCheckbox.disabled = true;

	return GVXRConfig.from_config(WebCTConfig.to_json({beam:true,detector:true,samples:true,capture:true,recon:true},[]) as configFull);
}


function updateXtekConfig() {
	return {} as configSubset;
}

function setExportContent(content:string):void {
	// Update code preview
	CodePreview.textContent = content;
	ConfigContent = content;
}

function downloadConfig():void {
	// Create blob
	const blob = new Blob([ConfigContent], {type:"text/plain"});

	const va = document.createElement("a");
	va.href = window.URL.createObjectURL(blob);

	switch (ConfigFormat) {
	case ExportMode.JSON:
		va.download = "Config-WebCT.json";
		break;
	case ExportMode.GVXR:
		va.download = "Config-GVXR.json";
		break;
	case ExportMode.XTEK:
		va.download = "Config-XTEK.xtek";
		break;
	}

	va.click();
}

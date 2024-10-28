import { SlButton, SlCheckbox, SlDialog, SlIconButton, SlInput, SlMenuItem } from "@shoelace-style/shoelace";
import { AlertType, showAlert } from "../../../base/static/js/base";
import { GVXRConfig } from "./formats/GVXRLoader";
import { configFull, configSubset, ExportModes as ExportMode, ExportOptions, getConfigKeys, WEBCT_FULL_CONFIG, WebCTConfig } from "./types";
import { XTEKCTConfig } from "./formats/XTEKCTLoader";
import { ScanDocuConfig } from "./formats/ScanDocuLoader";

let ConfigButton:SlIconButton;
let CloseDialogButton:SlButton;
let ConfigDialog:SlDialog;
let JsonSettingsPanel:HTMLDivElement;
let GvxrSettingsPanel:HTMLDivElement;
let DownloadConfigButton:SlButton;
let UploadConfigButton:SlButton;

let ModeButton: SlButton;
let ModeJson: SlMenuItem;
let ModeGVXR: SlMenuItem;
let ModeXTEK: SlMenuItem;
let ModePython: SlMenuItem;
let ModeDiondo: SlMenuItem;

let BeamCheckbox: SlCheckbox;
let DetectorCheckbox: SlCheckbox;
let SampleCheckbox: SlCheckbox;
let CaptureCheckbox: SlCheckbox;
let ReconCheckbox: SlCheckbox;

let OptionMatasIDCheckbox: SlCheckbox;
let OptionReconstructionFolderInput: SlInput;
let OptionProjectionFolderInput: SlInput;

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
	const settings_panel_gvxr = document.getElementById("settingsPanelGVXR")
	const button_config_download = document.getElementById("buttonConfigDownload");
	const button_config_upload = document.getElementById("buttonConfigUpload");

	const button_mode = document.getElementById("buttonMode");
	const menu_mode_json = document.getElementById("menuModeJson");
	const menu_mode_gvxr = document.getElementById("menuModeGVXR");
	const menu_mode_xtek = document.getElementById("menuModeXTEK");
	const menu_mode_python = document.getElementById("menuModePython");
	const menu_mode_diondo = document.getElementById("menuModeXMLDiondo");

	const checkbox_config_beam = document.getElementById("checkboxConfigBeam");
	const checkbox_config_detector = document.getElementById("checkboxConfigDetector");
	const checkbox_config_samples = document.getElementById("checkboxConfigSamples");
	const checkbox_config_capture = document.getElementById("checkboxConfigCapture");
	const checkbox_config_recon = document.getElementById("checkboxConfigRecon");

	const checkbox_option_matasid = document.getElementById("checkboxOptMatasID");
	const input_option_reconstruction_folder = document.getElementById("inputOptSimReconstructionFolder")
	const input_option_projection_folder = document.getElementById("inputOptSimProjectionFolder")

	if (button_config === null ||
		dialog_config == null ||
		button_config_close == null ||
		preview_code == null ||
		button_mode == null ||
		settings_panel_json == null ||
		settings_panel_gvxr == null ||
		button_config_download == null ||
		button_config_upload == null ||
		menu_mode_json == null ||
		menu_mode_gvxr == null ||
		menu_mode_xtek == null ||
		menu_mode_python == null ||
		menu_mode_diondo == null ||
		checkbox_config_beam == null ||
		checkbox_config_detector == null ||
		checkbox_config_samples == null ||
		checkbox_config_capture == null ||
		checkbox_config_recon == null ||
		checkbox_option_matasid == null ||
		input_option_reconstruction_folder == null ||
		input_option_projection_folder == null) {
		console.log(button_config);
		console.log(dialog_config);
		console.log(button_config_close);
		console.log(preview_code);
		
		console.log(settings_panel_json);
		console.log(settings_panel_gvxr);
		
		console.log(button_config_download);
		console.log(button_config_upload);

		console.log(button_mode);
		console.log(menu_mode_json);
		console.log(menu_mode_gvxr);
		console.log(menu_mode_xtek);
		console.log(menu_mode_python);
		console.log(menu_mode_diondo);

		console.log(checkbox_config_beam);
		console.log(checkbox_config_detector);
		console.log(checkbox_config_samples);
		console.log(checkbox_config_capture);
		console.log(checkbox_config_recon);

		console.log(checkbox_option_matasid);
		console.log(input_option_reconstruction_folder);
		console.log(input_option_projection_folder);

		return false;
	}

	ConfigDialog = dialog_config as SlDialog;
	CloseDialogButton = button_config_close as SlButton;
	CloseDialogButton.onclick=()=>{
		ConfigDialog.hide();
	};

	JsonSettingsPanel = settings_panel_json as HTMLDivElement;
	GvxrSettingsPanel = settings_panel_gvxr as HTMLDivElement;

	DownloadConfigButton = button_config_download as SlButton;
	DownloadConfigButton.onclick = downloadConfig;
	UploadConfigButton = button_config_upload as SlButton;
	UploadConfigButton.onclick = showUploadConfigDialog;

	ModeButton = button_mode as SlButton;
	ModeJson = menu_mode_json as SlMenuItem;
	ModeGVXR = menu_mode_gvxr as SlMenuItem;
	ModeXTEK = menu_mode_xtek as SlMenuItem;
	ModePython = menu_mode_python as SlMenuItem;
	ModeDiondo = menu_mode_diondo as SlMenuItem;
	// Diondo as_text() is not implemented
	ModeDiondo.hidden = true;


	ModeButton.onclick = updateConfigPreview;
	ModeJson.onclick = () => {setMode(ExportMode.JSON);};
	ModeGVXR.onclick = () => {setMode(ExportMode.GVXR);};
	ModeXTEK.onclick = () => {setMode(ExportMode.XTEK);};
	ModePython.onclick = () => {setMode(ExportMode.PYTHON);};
	ModeDiondo.onclick = () => {setMode(ExportMode.DIONDO);}

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

	OptionProjectionFolderInput = input_option_projection_folder as SlInput;
	OptionReconstructionFolderInput = input_option_reconstruction_folder as SlInput

	OptionProjectionFolderInput.addEventListener("sl-change", updateConfigPreview)
	OptionReconstructionFolderInput.addEventListener("sl-change", updateConfigPreview)

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
	ModeGVXR.checked = false;
	ModeJson.checked = false;
	ModeXTEK.checked = false;
	ModePython.checked = false;
	ModeDiondo.checked = false;

	switch (mode) {
	case ExportMode.JSON:
		ModeButton.textContent = "Format: JSON";
		ModeJson.checked = true;
		ConfigFormat = ExportMode.JSON;
		break;
	case ExportMode.GVXR:
		ModeButton.textContent = "Format: gVXR";
		ModeGVXR.checked = true;
		ConfigFormat = ExportMode.GVXR;
		break;
	case ExportMode.XTEK:
		ModeButton.textContent = "Format: XtekCT";
		ModeXTEK.checked = true;
		ConfigFormat = ExportMode.XTEK;
		break;
	case ExportMode.PYTHON:
		ModeButton.textContent = "Format: Python";
		ModePython.checked = true;
		ConfigFormat = ExportMode.PYTHON;
		break;
	case ExportMode.DIONDO:
		ModeButton.textContent = "Format: XML (Diondo)";
		ModeDiondo.checked = true;
		ConfigFormat = ExportMode.DIONDO;
		break;
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
	GvxrSettingsPanel.classList.add("hidden");
	GvxrSettingsPanel.setAttribute("mode", "gvxr");

	// Call independent mode update functions
	let content:string;
	CaptureCheckbox.innerHTML = "<sl-icon name=\"camera-reels\"></sl-icon> Capture Plan"
	ReconCheckbox.innerHTML = "<sl-icon name=\"box\"></sl-icon> Reconstruction"

	switch (ConfigFormat) {
	case ExportMode.JSON:
		content = updateJsonConfig();
		break;
	case ExportMode.GVXR:
		content = updateGvxrConfig();
		break;
	case ExportMode.XTEK:
		content = updateXtekConfig();
		break;
	case ExportMode.PYTHON:
		content = updatePythonConfig();
		CaptureCheckbox.innerHTML = "<sl-icon name=\"camera-reels\"></sl-icon> Simulate X-ray Scan"
		ReconCheckbox.innerHTML = "<sl-icon name=\"box\"></sl-icon> Reconstruct with CIL"
		break;
	case ExportMode.DIONDO:
		content = updateDiondoConfig();
		break;
	}

	// update export box, and download, with text content
	setExportContent(content);
}


function getExportOptions(): ExportOptions {
	return {
		MatasId: OptionMatasIDCheckbox.checked,
		ProjectionFolder: OptionProjectionFolderInput.value,
		ReconstructionFolder: OptionReconstructionFolderInput.value,
		gvxrIncludeScan: CaptureCheckbox.checked,
		pythonIncludeReconstruction: ReconCheckbox.checked,
	}
}

// Helper function to mark all export options as enabled and locked.
// Common for most xct configurations
function forceFullExport() {
	BeamCheckbox.disabled = true;
	DetectorCheckbox.disabled = true;
	SampleCheckbox.disabled = true;
	CaptureCheckbox.disabled = true;
	ReconCheckbox.disabled = true;

	BeamCheckbox.checked = true;
	DetectorCheckbox.checked = true;
	SampleCheckbox.checked = true;
	CaptureCheckbox.checked = true;
	ReconCheckbox.checked = true;
}


function updateJsonConfig() {
	// Visual: Disable options based on enabled elements
	OptionMatasIDCheckbox.disabled = !SampleCheckbox.checked;
	JsonSettingsPanel.classList.remove("hidden");

	// Return config
	return JSON.stringify(
		WebCTConfig.to_json(
			{
				beam: BeamCheckbox.checked,
				detector: DetectorCheckbox.checked,
				samples:SampleCheckbox.checked,
				capture: CaptureCheckbox.checked,
				recon:ReconCheckbox.checked
			},
			getExportOptions()
		),
		undefined,
		4);
}

function updateGvxrConfig() {
	let options = getExportOptions()
	BeamCheckbox.disabled = true; BeamCheckbox.checked = true;
	DetectorCheckbox.disabled = true; DetectorCheckbox.checked = true;
	SampleCheckbox.disabled = true; SampleCheckbox.checked = true;
	// CaptureCheckbox.disabled = true; CaptureCheckbox.checked = true;
	ReconCheckbox.disabled = true; ReconCheckbox.checked = false;

	GvxrSettingsPanel.classList.remove("hidden")
	GvxrSettingsPanel.setAttribute("mode", "gvxr");
	OptionProjectionFolderInput.disabled = !CaptureCheckbox.checked;

	return GVXRConfig.from_config(WebCTConfig.to_json(WEBCT_FULL_CONFIG, options) as configFull, options).to_text()
}

function updateXtekConfig() {
	forceFullExport()
	let options = getExportOptions()
	SampleCheckbox.checked = false;
	return XTEKCTConfig.from_config(WebCTConfig.to_json(WEBCT_FULL_CONFIG, options) as configFull, options).to_text();
}

function updateDiondoConfig() {
	forceFullExport()
	let options = getExportOptions()
	SampleCheckbox.checked = false;
	return ScanDocuConfig.from_config(WebCTConfig.to_json(WEBCT_FULL_CONFIG, options) as configFull, options).to_text();
}

function updatePythonConfig() {

	let options = getExportOptions()

	BeamCheckbox.disabled = true; BeamCheckbox.checked = true;
	DetectorCheckbox.disabled = true; DetectorCheckbox.checked = true;
	SampleCheckbox.disabled = true; SampleCheckbox.checked = true;

	GvxrSettingsPanel.classList.remove("hidden")
	GvxrSettingsPanel.setAttribute("mode", "python");

	OptionProjectionFolderInput.disabled = !CaptureCheckbox.checked;
	OptionReconstructionFolderInput.disabled = !ReconCheckbox.checked;

	// Return config
	return WebCTConfig.to_python({
		beam: true,
		detector: true,
		samples: true,
		capture: CaptureCheckbox.checked,
		recon: ReconCheckbox.checked
	}, options);
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
	case ExportMode.DIONDO:
		va.download = "Config-Diondo.xml";
		break;
	case ExportMode.PYTHON:
		va.download = "simulate.py";
		break;
	}

	va.click();
}

function showUploadConfigDialog():void {
	const fInput = document.createElement("input");
	fInput.type = "file";
	fInput.accept = ".json, .xtekct, .xml";

	fInput.addEventListener("change",()=> {
		console.log("Filebrowser change");

		// check to see if a file was selected
		if (fInput.files === undefined || fInput.files?.length != 1) {
			return;
		}
		const file = fInput.files[0];

		console.log("Loading file");

		file.text().then((text) => {
			console.log("Parsing file");
			parseImport(text);
		});
	});
	fInput.dispatchEvent(new MouseEvent("click"));
}

function parseImport(text:string) {
	let config:configSubset | null = null;
	if (text[0] == "{") {
		// File format starts with a json token, try parsing and see what happens
		try {
			const result = JSON.parse(text);

			// File format is a json format, check to see if webct or gvxr loaders will parse it.
			if (GVXRConfig.can_parse(result)) {
				// gvxr
				console.log("Importing GVXR Config");
				config = GVXRConfig.from_text(text).as_config();
				console.log(config);
			} else {
				// webct
				console.log("Importing WebCT Config");
				config = WebCTConfig.parse_json(result);
				console.log(config);
			}
		} catch (error) {
			console.error(error);
			// Json parse error, but first key is a '{'
			// (currently, this doesn't match any supported filetype)
			console.error("Unparsable JSON file!");
			return;
		}
	} else if (text[0] == "[") {
		// likely INI file format, starting with '[text]'
		if (XTEKCTConfig.can_parse(text)) {
			console.log("Importing XTEKCT Config");
			config = XTEKCTConfig.from_text(text).as_config();
			console.log(config);
		}
	} else if (text[0] == "<" ) {
		// likely XML file format, starting with '<xml'
		if (ScanDocuConfig.can_parse(text)) {
			console.log("Importing ScanDocPara Config");
			config = ScanDocuConfig.from_text(text).as_config();
			console.log(config);
		}
	} else {
		// Invalid file?
		console.error("Unknown config filetype");
		return;
	}

	// Assume config is now populated, any errors are early returns
	if (config === null) {
		return;
	}

	const keys = getConfigKeys(config);
	// Update checkboxes to show what properties are being imported...

	BeamCheckbox.checked = keys.beam;
	DetectorCheckbox.checked = keys.detector;
	SampleCheckbox.checked = keys.samples;
	CaptureCheckbox.checked = keys.capture;
	ReconCheckbox.checked = keys.recon;

	console.log("Applied Config");
	ConfigDialog.hide();

	// apply config
	WebCTConfig.apply(config);
	console.log(config);
	showAlert("Configuration Applied", AlertType.INFO, 5);
}

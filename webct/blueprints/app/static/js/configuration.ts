import { SlButton, SlDialog, SlIconButton } from "@shoelace-style/shoelace";
import { getBeamParms } from "../../../beam/static/js/beam";
import { getCaptureParams } from "../../../capture/static/js/capture";
import { getDetectorParams } from "../../../detector/static/js/detector";
import { getReconParams } from "../../../reconstruction/static/js/recon";
import { getSampleParams } from "../../../samples/static/js/samples";
import { WebCTConfig } from "./types";

// import hljs from "highlight.js"

let ConfigButton:SlIconButton;
let CloseDialogButton:SlButton;
let ConfigDialog:SlDialog;

let CodePreview:HTMLPreElement;

let ConfigContent:string;

export function setupConfig():boolean {
	const button_config = document.getElementById("buttonConfig");
	const button_config_close = document.getElementById("buttonConfigClose");
	const dialog_config = document.getElementById("dialogueConfig");
	const preview_code = document.getElementById("codePreview");

	if (button_config === null ||
		dialog_config == null ||
		button_config_close == null ||
		preview_code == null) {
		console.log(button_config);
		console.log(dialog_config);
		console.log(button_config_close);
		console.log(preview_code);
		return false;
	}

	ConfigDialog = dialog_config as SlDialog;
	CloseDialogButton = button_config_close as SlButton;
	CloseDialogButton.onclick=()=>{
		ConfigDialog.hide();
	};

	CodePreview = preview_code as HTMLPreElement;
	ConfigButton = button_config as SlIconButton;
	ConfigButton.onclick = () => {
		updateConfigPreview();
		ConfigDialog.show();
	};
	// hljs.highlightElement(CodePreview)
	return true;
}

function updateConfigPreview() {
	// type==json
	// const exportText:Array<string> = [];

	// Create a config variable
	const config:WebCTConfig = {
		Beam: getBeamParms(),
		Capture: getCaptureParams(),
		Detector: getDetectorParams(),
		Reconstruction: getReconParams(),
		Samples: getSampleParams()
	};

	// Remove selected parts from the export
	setExportContent(JSON.stringify(config, undefined, 4));
}

function setExportContent(content:string):void {
	// Update code preview
	CodePreview.textContent = content;
	ConfigContent = content;
}

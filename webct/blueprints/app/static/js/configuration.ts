import { SlButton, SlDialog, SlIconButton } from "@shoelace-style/shoelace";

// import hljs from "highlight.js"

let ConfigButton:SlIconButton;
let CloseDialogButton:SlButton;
let ConfigDialog:SlDialog;

let CodePreview:HTMLPreElement;

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

	ConfigButton = button_config as SlIconButton;
	ConfigButton.onclick = () => {
		ConfigDialog.show();
	};

	CodePreview = preview_code as HTMLPreElement;
	CodePreview.textContent = JSON.stringify({
		hello: "How are you today"
	},undefined,4);

	// hljs.highlightElement(CodePreview)
	return true;
}

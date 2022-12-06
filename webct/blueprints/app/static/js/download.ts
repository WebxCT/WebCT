import { SlButton, SlDialog, SlIconButton} from "@shoelace-style/shoelace";

let DownloadButton:SlIconButton;
let CloseDialogButton:SlButton;
let DownloadDialog:SlDialog;

export function setupDownload():boolean {
	console.log("setupDownload");

	const button_download = document.getElementById("buttonDownload");
	const button_download_close = document.getElementById("buttonDownloadClose");
	const dialog_download = document.getElementById("dialogueDownload");

	if (button_download === null ||
		dialog_download == null ||
		button_download_close == null) {

		console.log(button_download);
		console.log(dialog_download);
		console.log(button_download_close);
		return false;
	}

	DownloadDialog = dialog_download as SlDialog;
	CloseDialogButton = button_download_close as SlButton;
	CloseDialogButton.onclick=()=>{
		DownloadDialog.hide();
	};

	DownloadButton = button_download as SlIconButton;
	DownloadButton.onclick=()=> {
		DownloadDialog.show();
	};

	return true;
}

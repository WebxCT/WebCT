/**
 * Beam.ts : Functions relating to displaying and editing beam properties.
 * @author Iwan Mitchell
 */

import { SlButton, SlDialog, SlInput, SlProgressBar, SlRadio, SlSelect, SlTab, SlTabGroup } from "@shoelace-style/shoelace";
import { serialize } from "@shoelace-style/shoelace/dist/utilities/form";
import { AlertType, showAlert } from "../../../base/static/js/base";
import { prepareSampleRequest, processResponse, requestMaterialList, requestModelList, requestSampleData, SamplesResponseRegistry, sendMaterialData, sendSamplesData, uploadModel, SamplesRequestRegistry, deleteMaterialData } from "./api";
import { DetectorRequestError, showError } from "./errors";
import { getSelectedMaterial, MixtureInputList, setSelectedMaterial, updateMaterialDialog } from "./materialDialogue";

import { EventNewCategory, Material, MaterialLibrary, SampleProperties, SamplePropertiesID, SampleSettings } from "./types";
import { markValid } from "../../../base/static/js/validation";

// ====================================================== //
// ================== Document Elements ================= //
// ====================================================== //
let SampleScalingElement: SlInput;

export let MaterialDialog: SlDialog;
let MaterialCloseButton: SlButton;
let MaterialViewButton: SlButton;
let MaterialSubmitButton: SlButton;
let MaterialSaveButton: SlButton;
let MaterialTab: SlTabGroup;

let UploadCompleteDialog: SlDialog;
let UploadCloseButton: SlButton;

let SampleDialog: SlDialog;
let AddSampleButton: SlButton;
let SampleDiv: HTMLDivElement;
let SampleUploadInput: HTMLInputElement;
let SampleUploadBar: SlProgressBar;

let SampleDialogSubmit: SlButton;
let SampleDialogClose: SlButton;
let SampleDialogRadio1: SlRadio;
let SampleDialogRadio2: SlRadio;
let SampleDialogSelect: SlSelect;
let SampleDialogInput: SlInput;

export let CategoryDialog: SlDialog;
let CategoryDialogName: SlInput;
let CategoryDialogSubmit: SlButton;
let CategoryDialogClose: SlButton;


// ====================================================== //
// ======================= Globals ====================== //
// ====================================================== //
let SessionSamples: Record<string, SampleProperties>;
let AvailableModels: string[];

let UploadRequest: XMLHttpRequest | null;
let UploadData: FormData | null;

export let MaterialLib: MaterialLibrary;

let SelectedSampleLabel:string = "";

let RecentMaterials: Record<string, number> = {};

export const DefaultMaterial = "element/aluminium";


// ====================================================== //
// ======================== Setup ======================= //
// ====================================================== //

/**
 * Setup Beam component for use, including element discovery, and initial state
 * api requests.
 */
export function setupSamples(): boolean {
	console.log("setupSamples");
	SessionSamples = {};

	window.customElements.define("mixture-input-list", MixtureInputList, { extends: "ul" });

	const sample_scaling_element = document.getElementById("inputSampleScaling");

	const dialogue_complete_upload = document.getElementById("dialogueUploadComplete");
	const button_complete_close = document.getElementById("buttonUploadClose");

	const dialogue_material_library = document.getElementById("dialogueMaterial");
	const button_material_close = document.getElementById("buttonMaterialClose");
	const button_material_open = document.getElementById("buttonViewMaterials");
	const button_material_submit = document.getElementById("buttonMaterialSubmit");
	const button_material_save = document.getElementById("buttonMaterialSave");
	const tab_material = document.getElementById("tabMaterial");

	const dialogue_sample_element = document.getElementById("dialogueSampleSelect");
	const button_sample_add = document.getElementById("buttonSampleAdd");
	const samples_div = document.getElementById("divSamples");
	const sample_upload_input = document.getElementById("inputSampleFile");
	const sample_upload_bar = document.getElementById("barSampleUpload");

	const sample_upload_submit = document.getElementById("buttonSampleSubmit");
	const sample_upload_close = document.getElementById("buttonSampleClose");
	const sample_upload_radio1 = document.getElementById("radioSampleSelect");
	const sample_upload_radio2 = document.getElementById("radioSampleUpload");
	const sample_upload_label = document.getElementById("inputSampleLabel");
	const sample_upload_select = document.getElementById("selectSample");

	const category_dialog = document.getElementById("dialogCategory");
	const category_dialog_name = document.getElementById("inputCategoryName");
	const category_dialog_submit = document.getElementById("buttonCategorySubmit");
	const category_dialog_close = document.getElementById("buttonCategoryClose");

	if (sample_scaling_element == null ||
		tab_material == null ||
		button_material_open == null ||
		dialogue_material_library == null ||
		button_material_close == null ||
		button_complete_close == null ||
		button_material_submit == null ||
		button_material_save == null ||
		dialogue_complete_upload == null ||
		dialogue_sample_element == null ||
		button_sample_add == null ||
		samples_div == null ||
		sample_upload_input == null ||
		sample_upload_bar == null ||
		sample_upload_submit == null ||
		sample_upload_close == null ||
		sample_upload_radio1 == null ||
		sample_upload_radio2 == null ||
		sample_upload_label == null ||
		sample_upload_select == null ||
		category_dialog == null ||
		category_dialog_name == null ||
		category_dialog_submit == null ||
		category_dialog_close == null) {

		console.log(sample_scaling_element);
		console.log(dialogue_material_library);
		console.log(button_material_close);
		console.log(button_material_open);
		console.log(button_material_submit);
		console.log(tab_material);
		console.log(button_complete_close);
		console.log(dialogue_complete_upload);
		console.log(dialogue_sample_element);
		console.log(button_sample_add);
		console.log(samples_div);
		console.log(sample_upload_input);
		console.log(sample_upload_bar);
		console.log(sample_upload_submit);
		console.log(sample_upload_close);
		console.log(sample_upload_radio1);
		console.log(sample_upload_radio2);
		console.log(sample_upload_label);
		console.log(sample_upload_select);
		console.log(category_dialog);
		console.log(category_dialog_name);
		console.log(category_dialog_submit);
		console.log(category_dialog_close);

		showAlert("Samples setup failure", AlertType.ERROR);
		return false;
	}

	RecentMaterials = {"element/aluminium":1};
	SampleScalingElement = sample_scaling_element as SlInput;
	UploadCompleteDialog = dialogue_complete_upload as SlDialog;
	SampleDialog = dialogue_sample_element as SlDialog;
	SampleDialogSelect = sample_upload_select as SlSelect;
	SampleDialogInput = sample_upload_label as SlInput;
	SampleDialogInput.addEventListener("sl-change", () => {
		updateDialog();
	});
	MaterialDialog = dialogue_material_library as SlDialog;
	MaterialViewButton = button_material_open as SlButton;
	MaterialViewButton.onclick = () => { showMaterialLibrary(false); };
	MaterialCloseButton = button_material_close as SlButton;
	MaterialTab = tab_material as SlTabGroup;
	SampleDialogSelect.addEventListener("sl-change", () => {
		SampleDialogRadio1.click()
		updateDialog();
	});
	UploadCloseButton = button_complete_close as SlButton;
	UploadCloseButton.onclick = () => { UploadCompleteDialog.hide(); };
	MaterialCloseButton.onclick = () => { MaterialDialog.hide(); };
	MaterialSaveButton = button_material_save as SlButton;
	MaterialSaveButton.onclick = () => {
		SaveCurrentMaterial();
	};
	MaterialSubmitButton = button_material_submit as SlButton;
	MaterialSubmitButton.onclick = () => {
		// Save current material may change the currently selected material ID
		// If the ID is changed from the update, the new material will be selected.
		// Therefore, we must wait for the materials to be updated, before getting the currently selected material.
		SaveCurrentMaterial().then(() => {
			const [catID, matID, panel] = getSelectedMaterial();
			if (catID == "" || matID == "") {
				return;
			}

			setSampleElement(catID, matID);
			MaterialDialog.hide();
		});
	};

	SampleDialog.addEventListener("sl-request-close", (event: any) => {
		if (event.detail.source === "overlay") {
			event.preventDefault();
		} else {
			if (UploadRequest !== null) {
				UploadRequest.abort();
			} else {
				resetUpload();
			}
		}
	});

	SampleDialogClose = sample_upload_close as SlButton;
	SampleDialogClose.addEventListener("click", () => { SampleDialog.hide(); });

	SampleDialogRadio1 = sample_upload_radio1 as SlRadio;
	SampleDialogRadio2 = sample_upload_radio2 as SlRadio;
	SampleDialogSubmit = sample_upload_submit as SlButton;

	for (let index = 0; index < [SampleDialogRadio1, SampleDialogRadio2].length; index++) {
		const radio = [SampleDialogRadio1, SampleDialogRadio2][index] as SlRadio;
		radio.addEventListener("sl-change", () => {
			updateDialog();
			if (radio.checked) {
				radio.parentElement?.classList.add("radioselect");
			} else {
				radio.parentElement?.classList.remove("radioselect");
			}

		});
	}

	AddSampleButton = button_sample_add as SlButton;
	AddSampleButton.onclick = () => {
		updateDialog();
		SampleDialog.show();
	};

	SampleDiv = samples_div as HTMLDivElement;

	SampleUploadBar = sample_upload_bar as SlProgressBar;

	SampleUploadInput = sample_upload_input as HTMLInputElement;
	SampleUploadInput.onchange = () => {
		// auto-select sample upload. click() is used to trigger radio button behaviour.
		SampleDialogRadio2.click()

		const formdata = new FormData();
		if (SampleUploadInput.files == null) {
			return;
		}

		formdata.append("file", SampleUploadInput.files[0]);

		const upload = uploadModel();
		upload.addEventListener("progress", (progress: ProgressEvent) => {
			SampleUploadBar.value = Math.floor((progress.loaded / progress.total) * 100);
			SampleUploadBar.textContent = SampleUploadBar.value + "%";
		});

		upload.addEventListener("load", (progress: ProgressEvent) => {
			SampleUploadBar.value = 100;
			if (upload.status == 200) {
				SampleUploadBar.classList.add("success");
				SampleUploadBar.textContent = "Uploaded!";
				UpdateModelList();

				SampleDialog.hide();
				UploadCompleteDialog.show();
				resetUpload();
			} else {
				SampleUploadBar.classList.add("fail");
				SampleUploadBar.textContent = "😢 Error During Upload";
				SampleDialogSubmit.variant = "danger";
				SampleDialogSubmit.removeAttribute("loading");
				SampleDialogSubmit.textContent = "X";
				SampleDialogSubmit.setAttribute("disabled", "true");
				UploadRequest = null;
				UploadData = null;
			}
		});
		upload.addEventListener("abort", () => {
			// Just reset, we don't care about leftover statuses
			resetUpload();
		});
		upload.addEventListener("error", () => {
			SampleUploadBar.classList.add("fail");
			SampleUploadBar.textContent = "😢 Error During Upload";
			SampleDialogSubmit.variant = "danger";
			SampleDialogSubmit.removeAttribute("loading");
			SampleDialogSubmit.textContent = "X";
			SampleDialogSubmit.setAttribute("disabled", "true");
			UploadRequest = null;
			UploadData = null;
		});

		// prepare for upload
		UploadRequest = upload;
		UploadData = formdata;

		updateDialog();
	};

	CategoryDialog = category_dialog as SlDialog;
	CategoryDialogName = category_dialog_name as SlInput;
	CategoryDialogSubmit = category_dialog_submit as SlButton;
	CategoryDialogClose = category_dialog_close as SlButton;
	CategoryDialogClose.onclick = () => {
		CategoryDialog.hide();
	};

	CategoryDialogSubmit.onclick = () => {
		// validate
		const catName = CategoryDialogName.value;
		if (catName == "") {
			console.log("catName is empty");
			return;
		}

		window.dispatchEvent(new CustomEvent("newCategory", {
			bubbles: true,
			cancelable: false,
			composed: false,
			detail: {
				name: catName,
			}
		} as EventNewCategory));
		CategoryDialog.hide();
	};
	CategoryDialog.addEventListener("sl-hide", () => {
		MaterialDialog.show();
	});




	return true;
}

// ====================================================== //
// =================== Display and UI =================== //
// ====================================================== //

function setSampleElement(catID: string, matID: string): void {
	if (matID == null || catID == null || SelectedSampleLabel == null) {
		return;
	}

	const fullmatID = catID + "/" + matID;

	if (fullmatID in RecentMaterials) {
		RecentMaterials[fullmatID] += 1;
	} else {
		RecentMaterials[fullmatID] = 1;
	}

	if (RecentMaterials[fullmatID] <= 0) {
		delete RecentMaterials[fullmatID];
	}

	console.log(RecentMaterials);

	// ! bug: Uncaught TypeError: SessionSamples[SelectedSampleIndex] is undefined

	SessionSamples[SelectedSampleLabel].materialID = fullmatID;

	updateSampleCards();
}

function resetUpload(): void {
	SampleUploadBar.classList.remove("success");
	SampleUploadBar.classList.remove("fail");
	SampleUploadBar.value = 0;
	SampleUploadBar.textContent = "0%";

	SampleDialogSelect.removeAttribute("disabled");
	SampleDialogSubmit.removeAttribute("loading");
	SampleDialogRadio1.removeAttribute("disabled");
	SampleDialogSubmit.variant = "success";

	UploadRequest = null;
	UploadData = null;

}

function updateDialog(): void {
	if (SampleDialogRadio1.checked) {
		SampleDialogSubmit.textContent = "Add Sample";
		
		let exists = false;
		if (SampleDialogInput.value == "" || SampleDialogInput.value in SessionSamples) {
			// do not allow empty input or duplicate labels
			markValid(SampleDialogInput, false);
			if (SampleDialogInput.value == "") {
				SampleDialogInput.helpText = "Sample must have a label";
			} else {
				SampleDialogInput.helpText = "Label already exists";
			}
		} else {
			markValid(SampleDialogInput, true);
			SampleDialogInput.helpText = "";
		}

		if (SampleDialogInput.value != "") {
			for (let index = 0; index < AvailableModels.length; index++) {
				const model = AvailableModels[index];
				if (SampleDialogSelect.value === model) {
					exists = true;
					break;
				}
			}
		}

		if (!exists) {
			console.log("no exist!");

			SampleDialogSubmit.setAttribute("disabled", "true");
			SampleDialogSubmit.onclick = null;
			return;
		}

		SampleDialogSubmit.onclick = () => {
			let label = SampleDialogInput.value
			if (label == "") {
				// if no sample label, don't do anything!
				return;
			}

			if (label in SessionSamples) {
				// sample with that name already exists, don't do anything
				// technically we could overwrite it, but better make that explicitly required.
				return;
			}

			// value is a valid model!
			// We want to add it to the existing material list
			SessionSamples[label] = {
				label: SampleDialogInput.value,
				modelPath: SampleDialogSelect.value as string,
				materialID: DefaultMaterial,
				sizeUnit: "mm",
			};

			if (DefaultMaterial in RecentMaterials) {
				RecentMaterials[DefaultMaterial] += 1;
			} else {
				RecentMaterials[DefaultMaterial] = 1;
			}

			SampleDialog.hide();
			updateSampleCards();
		};
		SampleDialogSubmit.removeAttribute("disabled");
	} else {
		SampleDialogSubmit.textContent = "Upload Sample";
		if (UploadData == null) {	
			SampleDialogSubmit.setAttribute("disabled", "true");
			SampleDialogSubmit.onclick = null;
		} else {
			SampleDialogSubmit.removeAttribute("disabled");
			SampleDialogSubmit.onclick = () => {
				// Disable UI
				SampleDialogSubmit.setAttribute("loading", "true");
				SampleDialogRadio1.setAttribute("disabled", "true");
				SampleDialogSelect.setAttribute("disabled", "true");

				// Start upload
				UploadRequest?.send(UploadData);
			};
		}
	}
}

function updateSampleCards(): void {
	// I dislike this method of menu list updating to display a mutable state.

	const nodes: HTMLDivElement[] = [];

	for (let key in SessionSamples) {
		const sample = SessionSamples[key];
		if (sample.materialID === undefined) {
			continue;
		}

		if (RecentMaterials[sample.materialID] == undefined) {
			RecentMaterials[sample.materialID] = 1;
		}
	}


	for (let key in SessionSamples) {
		const sample = SessionSamples[key];
		const card = document.createElement("div");
		card.classList.add("model");

		// Remove button
		const buttonDiv = document.createElement("div");
		buttonDiv.classList.add("remove");
		const buttonRemove = document.createElement("button");
		buttonRemove.textContent = "X";
		buttonRemove.onclick = () => {
			card.classList.add("removed");
			delete SessionSamples[key]
		};
		buttonDiv.appendChild(buttonRemove);

		// Main div
		const contentDiv = document.createElement("div");
		const modelName = document.createElement("p");
		modelName.textContent = sample.label;
		const modelPath = document.createElement("p");
		modelPath.textContent = sample.modelPath;

		// Material Select
		const materialSelect = document.createElement("sl-select");
		materialSelect.classList.add("material");

		const recentMaterialLabel = document.createElement("sl-menu-label");
		recentMaterialLabel.textContent = "Recent Materials";

		materialSelect.appendChild(recentMaterialLabel);

		for (const matID in RecentMaterials) {
			if (Object.prototype.hasOwnProperty.call(RecentMaterials, matID)) {
				const material = MaterialLib[matID.split("/")[0]][matID.split("/")[1]];
				if (material === null) {
					// silently ignore deleted materials; the user will just have
					// less recently used materials until they're replaced.
					continue;
				}

				const item = document.createElement("sl-menu-item");
				item.textContent = material.label;
				item.value = matID;

				// * This is a really stupid way to do this. Does not take into
				// * account final value for the samples when submitted, just what was
				// * last clicked, and hoping there is no deviation.
				item.onclick = () => {
					// Remove one count from current material
					// RecentMaterials[sample.materialID as string] -= 1;

					// Change material
					console.log("Set sample"+sample.label+" to "+matID);

					SessionSamples[key].materialID = matID;

					// Add one count to new material
					RecentMaterials[matID] += 1;
				};
				materialSelect.appendChild(item);
			}
		}
		const divider3 = document.createElement("sl-divider");

		const custom = document.createElement("sl-menu-item");
		custom.textContent = "Custom Material";
		custom.value = "";

		const customIcon = document.createElement("sl-icon");
		customIcon.slot = "prefix";
		customIcon.name = "gear";
		custom.appendChild(customIcon);
		custom.onclick = () => {
			SelectedSampleLabel = key;
			showMaterialLibrary(true);
		};

		materialSelect.appendChild(divider3);
		materialSelect.appendChild(custom);

		materialSelect.value = sample.materialID as string;

		contentDiv.appendChild(modelName);
		contentDiv.appendChild(modelPath);
		contentDiv.appendChild(materialSelect);

		card.appendChild(buttonDiv);
		card.appendChild(contentDiv);
		nodes.push(card);
	}

	SampleDiv.replaceChildren(...nodes);
}

function updateModelSelect(): void {

	const newnodes: HTMLElement[] = [];
	// make list of files as elements
	for (let index = 0; index < AvailableModels.length; index++) {
		const model = AvailableModels[index];
		const modelnode = document.createElement("sl-menu-item");
		modelnode.textContent = model;
		modelnode.value = model;
		newnodes.push(modelnode);

	}

	SampleDialogSelect.replaceChildren(...newnodes);
	updateDialog();
}

function showMaterialLibrary(selecting: boolean): void {

	if (selecting) {
		MaterialSubmitButton.outline = false;
		MaterialSubmitButton.disabled = false;
		MaterialSubmitButton.variant = "success";
	} else {
		MaterialSubmitButton.outline = true;
		MaterialSubmitButton.disabled = true;
		MaterialSubmitButton.variant = "neutral";
	}
	console.log("show false");

	MaterialDialog.show();
}

// ====================================================== //
// ==================== Page Updates ==================== //
// ====================================================== //

type MaterialFormData = {
	density: string,
	description: string,
	element: string,
	hu: string,
	label: string,
	compound: string,
	type: "compound" | "element" | "hu" | "mixture",
};

async function SaveCurrentMaterial(): Promise<void> {
	// Get currently selected material.
	const [catID, matID, form] = getSelectedMaterial();

	if (form == undefined) {
		// ! throw an error
		return;
	}

	form.addEventListener("sl-change", () => {
		MaterialSaveButton.outline = false;
	});

	const data: MaterialFormData = serialize(form) as unknown as MaterialFormData;
	MaterialSaveButton.disabled = true;
	MaterialSaveButton.outline = true;

	// Enumerate mixture materials
	const mixture: [string, number][] = [];
	const mixtureElements = form.querySelector("div.mixture > ul")?.childNodes as NodeListOf<ChildNode>;
	for (let index = 0; index < mixtureElements.length; index++) {
		const element = mixtureElements[index] as HTMLLIElement;
		if (element.firstChild?.nodeName == "DIV") {
			continue;
		}
		const mixelement = (element.querySelector("sl-input[type='text']") as SlInput).value;
		const mixweight = +(parseFloat((element.querySelector("sl-input[type='number']") as SlInput).value) / 100).toFixed(4);
		mixture.push([mixelement, mixweight]);
	}

	console.log(form);
	console.log(data);
	console.log(mixture);
	// Get panel elements
	let mat: Material["material"] = ["element", "C"];

	switch (data.type) {
	case "element":
		mat = ["element", data.element];
		break;
	case "compound":
		mat = ["compound", data.compound];
		break;
	case "hu":
		mat = ["hu", parseFloat(data.hu)];
		break;
	case "mixture":
		mat = ["mixture", mixture];
		break;
	default:
		break;
	}

	// Update local
	MaterialLib[catID][matID] = {
		label: data.label,
		density: parseFloat(data.density),
		description: data.description,
		material: mat,
	};

	let nMat: SamplesRequestRegistry["materialDataRequest"];

	// Flatten mixture materials
	if (mat[0] == "mixture") {
		nMat = {
			label: data.label,
			density: parseFloat(data.density),
			description: data.description,
			material: ["mixture", mat[1].flat()],
			category: catID
		};
	} else {
		nMat = {
			label: data.label,
			density: parseFloat(data.density),
			description: data.description,
			material: mat,
			category: catID
		};
	}

	console.log(nMat);


	return sendMaterialData(nMat).then((response) => {
		return response.json().then((data) => {
			if (data["catID"] == undefined || data["matID"] == undefined) {
				return;
			}
			console.log("New material created at " + data["catID"] + "/" + data["matID"]);
			return UpdateMaterials().then(() => {
				console.log("set selected material to " + data["catID"] + "/" + data["matID"]);

				setSelectedMaterial(data["catID"], data["matID"]);
			});
		});
	}
	).finally(() => {
		MaterialSaveButton.disabled = false;
	});

}

export function DeleteMaterial(categoryKey: string, materialKey: string) {

	if (!Object.prototype.hasOwnProperty.call(MaterialLib, categoryKey)) {
		console.error("Unable to find category '" + categoryKey + "' in materialLib for deletion");
		return;
	}

	const category = MaterialLib[categoryKey];
	if (!Object.prototype.hasOwnProperty.call(category, materialKey)) {
		console.error("Unable to find material '" + materialKey + "' in " + categoryKey + "/ for deletion");
		return;
	}

	deleteMaterialData({ categoryID: categoryKey, materialID: materialKey }).finally(() => {
		SyncSamples();
	});
}

/**
 * Send current sample settings to the server, then request new sample properties.
 */
export function SyncSamples(): Promise<void> {
	return setSamples().then(() => {
		UpdateSamples();
	});
}

function UpdateModelList(): Promise<void> {
	return requestModelList().then((response: Response) => {
		console.log("Sample List Response Status:" + response.status);
		if (response.status != 200) {
			return;
		}

		const result = response.json();

		result.then((result: unknown) => {
			const files = processResponse(result as SamplesResponseRegistry["sampleListResponse"], "sampleListResponse") as string[];
			AvailableModels = files;
			console.log(files);
			updateModelSelect();
		});
	});
}

/**
 * Request sample data from the server.
 */
export function UpdateSamples(): Promise<void> {

	return UpdateModelList().then(() => {
		return requestSampleData().then((response: Response) => {
			console.log("Sample Data Response Status:" + response.status);
			if (response.status == 400) {
				return;
			} else if (response.status == 500) {
				return;
			}

			// Convert to json
			const result = response.json();

			result.then((result: unknown) => {
				const properties = processResponse(result as SamplesResponseRegistry["sampleDataResponse"], "sampleDataResponse") as SampleSettings;
				setSampleParams(properties);
			}).catch(() => {
				return;
			});
		}).catch(() => {
			return;
		});
	}).then(() => { UpdateMaterials(); });
}

export function UpdateMaterials(): Promise<void> {
	return requestMaterialList().then((response: Response) => {
		console.log("Material List Response Status:" + response.status);
		if (response.status != 200) {
			return;
		}

		const result = response.json();

		return result.then((result: unknown) => {
			MaterialLib = processResponse(result as SamplesResponseRegistry["materialListResponse"], "materialListResponse") as MaterialLibrary;
			console.log(MaterialLib);
			updateMaterialDialog(MaterialTab);
		});

	});
}


/**
 * Search the material database and return an existing material based on material properties
 * @param refMat-Material instance
 */
function idFromMaterial(refMat:Material):string|null {
	for (const catKey in MaterialLib) {
		if (Object.prototype.hasOwnProperty.call(MaterialLib, catKey)) {
			const cat = MaterialLib[catKey];
			for (const matkey in cat) {
				if (Object.prototype.hasOwnProperty.call(cat, matkey)) {
					const mat = cat[matkey];
					console.log(mat);
					console.log(mat.material);
					console.log(refMat.material);
					if (mat.material[0] === refMat.material[0] && mat.material[1] === refMat.material[1]) {
						return catKey+"/"+matkey;
					}
				}
			}
		}
	}
	return null;
}

/**
 * Send sample parameters to the server.
 */
function setSamples(): Promise<void> {
	console.log("setsamples");

	// Ensure current samples are using IDs rather than materials
	const sampleParams = getSampleParams()
	const newMaterials:Material[] = [];

	for (let key in sampleParams.samples) {
		const sample = sampleParams.samples[key];

		// unknown sample ID, occurs if importing from a format that doesn't use webct's material library.
		if (sample.materialID === undefined && sample.material !== undefined) {
			// Attempt to get material from current database
			const perhapsMat = idFromMaterial(sample.material);
			if (perhapsMat !== null) {
				sample.materialID = perhapsMat;
			} else {
				newMaterials.push(sample.material);

				// Make an assumption that the imported material will succeed, and use the new ID
				sample.materialID = "Imported/" + sample.material.label;
			}
		}
	}

	console.log("Found " + newMaterials.length + " new materials.");

	const newMats:SamplesRequestRegistry["materialDataRequest"][] = [];

	if (newMaterials.length > 0) {
		// We have materials that do not exist in the database; we will create new ones
		if (!("Imported" in MaterialLib)) {
			MaterialLib.Imported = {};
		}

		for (let index = 0; index < newMaterials.length; index++) {
			console.log("Creating new material...");
			const mat = newMaterials[index];
			MaterialLib["Imported"][mat.label] = mat;

			const nMat:SamplesRequestRegistry["materialDataRequest"] = mat as SamplesRequestRegistry["materialDataRequest"];
			nMat.category = "Imported";
			newMats.push(nMat);
		}
	}

	let basePromise:Promise<void|Response> = Promise.resolve();
	for (let index = 0; index < newMats.length; index++) {
		const request = newMats[index];
		basePromise = basePromise.then(()=>{
			console.log("Sent new material");
			console.log(request);
			return sendMaterialData(request);
		});
	}

	// re-cast sampleparams materials to IDs since they've been transformed.
	// Unfortunately this requires a decomposition;- probably an easier way to compose types...
	const samples = prepareSampleRequest(Object.values(sampleParams.samples) as SamplePropertiesID[], sampleParams.scaling);

	return basePromise.then(()=>{

		return sendSamplesData(samples).then((response: Response) => {
			if (response.status == 200) {
				console.log("Samples updated");
			} else if (response.status == 500) {
				showError(DetectorRequestError.UNEXPECTED_SERVER_ERROR);
			}
			return;
		}).catch(() => {
			showError(DetectorRequestError.SEND_ERROR);
			return;
		});
	});
}

export function setSampleParams(properties:SampleSettings) {
	SessionSamples = properties.samples;

	SampleScalingElement.value = properties.scaling + "";

	// Not really sure why, but there's a bug in updateSampleCards that vanishes
	// when using a debugger. This is likely due to a race condition, but I
	// don't for the life of my know what's causing it.
	// Adding a small delay of 100ms is enough to solve the problem.
	setTimeout(updateSampleCards, 100);
}

export function getSampleParams():SampleSettings {
	// Create a copy to ensure downstream changes are not propagated.
	return {
		scaling: parseFloat(SampleScalingElement.value),
		samples: structuredClone(SessionSamples),
	}
}

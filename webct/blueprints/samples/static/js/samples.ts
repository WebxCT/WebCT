/**
 * Beam.ts : Functions relating to displaying and editing beam properties.
 * @author Iwan Mitchell
 */

import { SlButton, SlDialog, SlInput, SlProgressBar, SlRadio, SlSelect, SlTab, SlTabGroup, SlTabPanel } from "@shoelace-style/shoelace";
import { serialize } from "@shoelace-style/shoelace/dist/utilities/form";
import { AlertType, showAlert } from "../../../base/static/js/base";
import { prepareSampleRequest, processResponse, requestMaterialList, requestModelList, requestSampleData, SamplesResponseRegistry, sendMaterialData, sendSamplesData, uploadSample, SamplesRequestRegistry } from "./api";
import { DetectorRequestError, showError } from "./errors";
import { Material, MaterialLibrary, SampleProperties } from "./types";

// ====================================================== //
// ================== Document Elements ================= //
// ====================================================== //
let MaterialDialog: SlDialog;
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


// ====================================================== //
// ======================= Globals ====================== //
// ====================================================== //
let SessionSamples: SampleProperties[];
let AvailableModels: string[];

let UploadRequest: XMLHttpRequest | null;
let UploadData: FormData | null;

let MaterialLib: MaterialLibrary;

let SelectedMaterial: string;
let SelectedMaterialCategory: string;
const SelectedSample = 0;

let RecentMaterials: Record<string, number> = {};

export const DefaultMaterial = "element/copper";


// ====================================================== //
// ======================== Setup ======================= //
// ====================================================== //

/**
 * Setup Beam component for use, including element discovery, and initial state
 * api requests.
 */
export function setupSamples(): boolean {
	console.log("setupSamples");
	SessionSamples = [];

	// (document.getElementById("test") as SlButton).onclick = () => {
	// 	console.log("material test");

	// 	fetch("material/set", {
	// 		method: "PUT",
	// 		body: JSON.stringify({
	// 			label:"Test Material",
	// 			description: "Fake Test Material",
	// 			element:"Al",
	// 			density: 2.70,
	// 			category: "Element/aluminium"
	// 		}),
	// 		headers: {
	// 			"Content-Type": "application/json"
	// 		}
	// 	});
	// };

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

	if (tab_material == null ||
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
		sample_upload_select == null) {

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

		showAlert("Samples setup failure", AlertType.ERROR);
		return false;
	}

	RecentMaterials = {};

	UploadCompleteDialog = dialogue_complete_upload as SlDialog;
	SampleDialog = dialogue_sample_element as SlDialog;
	SampleDialogSelect = sample_upload_select as SlSelect;
	SampleDialogInput = sample_upload_label as SlInput;
	MaterialDialog = dialogue_material_library as SlDialog;
	MaterialViewButton = button_material_open as SlButton;
	MaterialViewButton.onclick = () => { showMaterialLibrary(false); };
	MaterialCloseButton = button_material_close as SlButton;
	MaterialTab = tab_material as SlTabGroup;
	SampleDialogSelect.addEventListener("sl-change", () => {
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
		const [catID, matID, panel] = getSelectedMaterial();

		if (catID == "" || matID == "") {
			return;
		}

		SelectedMaterialCategory = catID;
		SelectedMaterial = matID;
		setSampleElement();
		MaterialDialog.hide();
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
	AddSampleButton.onclick = () => { SampleDialog.show(); };

	SampleDiv = samples_div as HTMLDivElement;

	SampleUploadBar = sample_upload_bar as SlProgressBar;

	SampleUploadInput = sample_upload_input as HTMLInputElement;
	SampleUploadInput.onchange = () => {
		const formdata = new FormData();
		if (SampleUploadInput.files == null) {
			return;
		}

		formdata.append("file", SampleUploadInput.files[0]);

		const upload = uploadSample();
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

	return true;
}


function getSelectedMaterial(): [string, string, HTMLFormElement?] {
	const catID = (document.querySelector("#tabMaterial > sl-tab-panel[active]") as unknown as SlTabPanel).getAttribute("catID");
	const form = document.querySelector("#tabMaterial > sl-tab-panel[active] > sl-tab-group > sl-tab-panel[active] > form") as HTMLFormElement;
	const matID = (document.querySelector("#tabMaterial > sl-tab-panel[active] > sl-tab-group > sl-tab-panel[active]") as unknown as SlTabPanel).getAttribute("materialid");

	if (catID == null || matID == null) {
		return ["", "", undefined];
	}

	return [catID, matID, form];
}

// ====================================================== //
// =================== Display and UI =================== //
// ====================================================== //

function setSampleElement(): void {
	if (SelectedMaterial == null || SelectedMaterialCategory == null || SelectedSample == null) {
		return;
	}

	const matID = SelectedMaterialCategory + "/" + SelectedMaterial;

	if (matID in RecentMaterials) {
		RecentMaterials[matID] += 1;
	} else {
		RecentMaterials[matID] = 1;
	}

	if (RecentMaterials[matID] <= 0) {
		delete RecentMaterials[matID];
	}

	console.log(RecentMaterials);

	SessionSamples[SelectedSample].materialID = matID;

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
		for (let index = 0; index < AvailableModels.length; index++) {
			const model = AvailableModels[index];
			if (SampleDialogSelect.value === model) {
				exists = true;
				break;
			}
		}

		if (!exists) {
			console.log("no exist!");

			SampleDialogSubmit.setAttribute("disabled", "true");
			SampleDialogSubmit.onclick = null;
			return;
		}

		SampleDialogSubmit.onclick = () => {
			// value is a valid model!
			// We want to add it to the existing material list
			SessionSamples.push({
				label: SampleDialogInput.value,
				modelPath: SampleDialogSelect.value as string,
				materialID: DefaultMaterial,
				sizeUnit: "mm",
			});

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
	const nodes: HTMLDivElement[] = [];

	// I dislike this method of menu list updating to display a mutable state.

	for (let index = 0; index < SessionSamples.length; index++) {
		const sample = SessionSamples[index];
		console.log(sample);
		const card = document.createElement("div");
		card.classList.add("model");

		// Remove button
		const buttonDiv = document.createElement("div");
		buttonDiv.classList.add("remove");
		const buttonRemove = document.createElement("button");
		buttonRemove.textContent = "X";
		buttonRemove.onclick = () => {
			card.classList.add("removed");
			SessionSamples.splice(index, 1);
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
				const uses = RecentMaterials[matID];
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
					RecentMaterials[sample.materialID] -= 1;

					// Change material
					console.log("Set matid 	" + matID);
					SessionSamples[index].materialID = matID;
					console.log(sample);

					// Add one count to new material
					RecentMaterials[matID] += 1;
				};
				materialSelect.appendChild(item);
			}
		}

		const air = document.createElement("sl-menu-item");
		air.textContent = "Air";
		air.value = "special/air";
		air.onclick = () => {
			sample.materialID = "special/air";
		};

		const divider3 = document.createElement("sl-divider");

		const custom = document.createElement("sl-menu-item");
		custom.textContent = "Custom Material";
		custom.value = "";

		const customIcon = document.createElement("sl-icon");
		customIcon.slot = "prefix";
		customIcon.name = "gear";
		custom.appendChild(customIcon);
		custom.onclick = () => {
			showMaterialLibrary(true);
		};

		materialSelect.appendChild(air);
		materialSelect.appendChild(divider3);
		materialSelect.appendChild(custom);


		console.log("Current Material: " + sample.materialID);
		materialSelect.value = sample.materialID;
		console.log("New Material " + materialSelect.value);

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

/**
 * Update material dialog with categories and materials based on the
 * MaterialLibrary global.
 */
function updateMaterialDialog(): void {
	console.log("updateMaterialDialog");
	console.log("MaterialLibrary has " + Object.keys(MaterialLib).length) + " keys.";

	MaterialTab.replaceChildren(...[]);

	for (const categoryKey in MaterialLib) {
		if (Object.prototype.hasOwnProperty.call(MaterialLib, categoryKey)) {
			console.log("Processing category " + categoryKey);

			const category = MaterialLib[categoryKey];
			if (Object.keys(category).length === 0) {
				console.log("Early exit on category " + categoryKey);
				continue;
			}
			// Create category
			const ctab: SlTab = document.createElement("sl-tab");
			ctab.slot = "nav";
			ctab.panel = categoryKey;
			ctab.textContent = categoryKey;

			const ctpanel = document.createElement("sl-tab-panel");
			ctpanel.name = categoryKey;
			ctpanel.setAttribute("catid", categoryKey);

			const ctgroup = document.createElement("sl-tab-group");
			ctgroup.placement = "start";

			// Create material panels
			for (const materialKey in category) {
				console.log("Processing material " + categoryKey + "/" + materialKey);
				if (Object.prototype.hasOwnProperty.call(category, materialKey)) {
					const material = category[materialKey];

					const cmtab = document.createElement("sl-tab");
					cmtab.slot = "nav";
					cmtab.panel = material.label;
					cmtab.textContent = material.label;

					const cmtpanel = document.createElement("sl-tab-panel");
					cmtpanel.name = material.label;
					cmtpanel.setAttribute("materialid", materialKey);

					const form = document.createElement("form");
					form.classList.add("materialform");

					const nameInput = document.createElement("sl-input");
					nameInput.label = "Name";
					nameInput.helpText = "A short alphanumeric material name.";
					nameInput.placeholder = "Copper";
					nameInput.value = material.label;
					nameInput.name = "label";

					const deleteButton = document.createElement("sl-button");
					deleteButton.outline = true;
					deleteButton.variant = "danger";
					deleteButton.type = "button";
					const deleteButtonIcon = document.createElement("sl-icon");
					deleteButtonIcon.name = "trash-fill";
					deleteButton.appendChild(deleteButtonIcon);

					const descriptionInput = document.createElement("sl-input");
					descriptionInput.label = "Description";
					descriptionInput.helpText = "A brief description of the material.";
					descriptionInput.placeholder = "Atomically pure Copper sheet";
					descriptionInput.classList.add("wide");
					descriptionInput.value = material.description;
					descriptionInput.name = "description";

					const typeSelect = document.createElement("sl-select");
					typeSelect.hoist = true;
					typeSelect.label = "Material Type";
					typeSelect.value = "element";
					typeSelect.name = "type";

					const elementType = document.createElement("sl-menu-item");
					elementType.value = "element";
					elementType.textContent = "Element";

					const compoundType = document.createElement("sl-menu-item");
					compoundType.value = "compound";
					compoundType.textContent = "Compound";

					const mixtureType = document.createElement("sl-menu-item");
					mixtureType.value = "mixture";
					mixtureType.textContent = "Mixture";
					mixtureType.disabled = true;

					const huType = document.createElement("sl-menu-item");
					huType.value = "hu";
					huType.textContent = "HU Value";

					typeSelect.appendChild(elementType);
					typeSelect.appendChild(compoundType);
					typeSelect.appendChild(mixtureType);
					typeSelect.appendChild(huType);

					const densityInput = document.createElement("sl-input");
					densityInput.label = "Density";
					densityInput.type = "number";
					densityInput.step = 0.01;
					densityInput.value = material.density + "";
					densityInput.name = "density";
					const densityUnits = document.createElement("span");
					densityUnits.textContent = "g/cm^2";
					densityUnits.slot = "suffix";
					densityInput.appendChild(densityUnits);

					const divider = document.createElement("sl-divider");

					const elementDiv = document.createElement("div");
					elementDiv.classList.add("element");
					const elementInput = document.createElement("sl-input");
					elementInput.label = "Element";
					elementInput.helpText = "Elemental Symbol (Cl, O, Au, etc)";
					elementInput.name = "element";
					elementDiv.appendChild(elementInput);


					const compoundDiv = document.createElement("div");
					compoundDiv.classList.add("compound");
					compoundDiv.classList.add("hidden");
					const compoundInput = document.createElement("sl-input");
					compoundInput.label = "Compound";
					compoundInput.helpText = "Material Compound (H2O)";
					compoundInput.name = "compound";
					compoundDiv.appendChild(compoundInput);

					const mixtureDiv = document.createElement("div");
					// todo: mixture
					mixtureDiv.classList.add("mixture");
					mixtureDiv.classList.add("hidden");

					const huDiv = document.createElement("div");
					huDiv.classList.add("hu");
					huDiv.classList.add("hidden");
					const huInput = document.createElement("sl-input");
					huInput.label = "HU Value";
					huInput.helpText = "Hounsfield unit (CT number)";
					huInput.name = "hu";
					huDiv.appendChild(huInput);

					function SelectEvent() {
						if (typeSelect.value == "element") {
							elementDiv.classList.remove("hidden");
							mixtureDiv.classList.add("hidden");
							compoundDiv.classList.add("hidden");
							huDiv.classList.add("hidden");
							densityInput.classList.remove("hidden");
						} else if (typeSelect.value == "mixture") {
							elementDiv.classList.add("hidden");
							mixtureDiv.classList.remove("hidden");
							compoundDiv.classList.add("hidden");
							huDiv.classList.add("hidden");
							densityInput.classList.remove("hidden");
						} else if (typeSelect.value == "compound") {
							elementDiv.classList.add("hidden");
							mixtureDiv.classList.add("hidden");
							compoundDiv.classList.remove("hidden");
							huDiv.classList.add("hidden");
							densityInput.classList.remove("hidden");
						} else if (typeSelect.value == "hu") {
							elementDiv.classList.add("hidden");
							mixtureDiv.classList.add("hidden");
							densityInput.classList.add("hidden");
							compoundDiv.classList.add("hidden");
							huDiv.classList.remove("hidden");
						}
					}

					typeSelect.addEventListener("sl-change", SelectEvent);

					// Current element settings
					switch (material.material[0]) {
					case "element":
						elementInput.value = material.material[1];
						typeSelect.value = "element";
						break;
					case "compound":
						compoundInput.value = material.material[1];
						typeSelect.value = "compound";
						break;
					case "hu":
						huInput.value = material.material[1] + "";
						typeSelect.value = "hu";
						break;
					case "special":
						typeSelect.value = "Special";
						typeSelect.textContent = "Special";
						typeSelect.disabled = true;
						break;
					case "mixture":
						typeSelect.value = "mixture";
						typeSelect.disabled = true;
						break;
					default:
						break;
					}
					SelectEvent();

					const hiddenSave = document.createElement("button");
					hiddenSave.type = "submit";
					hiddenSave.style.display = "none";
					form.onsubmit = () => { SaveCurrentMaterial(); return false; };

					form.appendChild(hiddenSave);
					form.appendChild(nameInput);
					form.appendChild(deleteButton);
					form.appendChild(descriptionInput);
					form.appendChild(typeSelect);
					form.appendChild(divider);
					form.appendChild(densityInput);
					form.appendChild(elementDiv);
					form.appendChild(compoundDiv);
					form.appendChild(mixtureDiv);
					form.appendChild(huDiv);

					cmtpanel.appendChild(form);

					ctgroup.appendChild(cmtab);
					ctgroup.appendChild(cmtpanel);
				}
			}
			const addMaterialButton = document.createElement("sl-button");
			addMaterialButton.slot = "nav";
			addMaterialButton.size = "small";
			addMaterialButton.outline = true;
			addMaterialButton.circle = true;
			addMaterialButton.type = "button";

			const materialPlusIcon = document.createElement("sl-icon");
			materialPlusIcon.name = "plus";

			addMaterialButton.appendChild(materialPlusIcon);
			ctgroup.appendChild(addMaterialButton);
			ctpanel.append(ctgroup);
			MaterialTab.appendChild(ctab);
			MaterialTab.append(ctpanel);
		}
	}

	const addCategoryButton = document.createElement("sl-button");
	addCategoryButton.slot = "nav";
	addCategoryButton.size = "small";
	addCategoryButton.outline = true;
	addCategoryButton.circle = true;
	addCategoryButton.type = "button";

	const categoryPlusIcon = document.createElement("sl-icon");
	categoryPlusIcon.name = "plus";

	addCategoryButton.appendChild(categoryPlusIcon);
	MaterialTab.appendChild(addCategoryButton);

	return;
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
}

function SaveCurrentMaterial(): void {
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

	console.log(form);
	console.log(data);
	// Get panel elements
	let mat: Material["material"] = ["special", "air"];

	switch (data.type) {
	case "element":
		mat = ["element", data.element];
		break;
	case "compound":
		mat = ["compound", data.compound];
		break;
	case "hu":
		mat = ["hu", parseFloat(data.hu)];
	default:
		break;
	}

	// Get new attributes.
	// Upload local material, and update server.
	const nMat: SamplesRequestRegistry["materialDataRequest"] = {
		label: data.label,
		density: parseFloat(data.density),
		description: data.description,
		material: mat,
		category: catID
	};

	console.log(nMat);
	sendMaterialData(nMat).finally(() => {
		MaterialSaveButton.disabled = false;
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
				const properties = processResponse(result as SamplesResponseRegistry["sampleDataResponse"], "sampleDataResponse") as SampleProperties[];
				SessionSamples = properties;

				console.log(properties);

				updateSampleCards();
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

		result.then((result: unknown) => {
			MaterialLib = processResponse(result as SamplesResponseRegistry["materialListResponse"], "materialListResponse") as MaterialLibrary;
			updateMaterialDialog();
		});

	});
}


/**
 * Send sample parameters to the server.
 */
function setSamples(): Promise<void> {
	const samples = prepareSampleRequest(SessionSamples);
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
}

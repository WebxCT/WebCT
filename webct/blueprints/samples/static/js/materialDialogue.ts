/**
 * materialDialogue.ts : An interactive material database.
 * @author Iwan Mitchell
 */

import { SlButton, SlInput, SlTab, SlTabGroup, SlTabPanel } from "@shoelace-style/shoelace";
import { CategoryDialog, DeleteMaterial, MaterialDialog, MaterialLib } from "./samples";
import { EventNewCategory, Material } from "./types";

function createElementInput(): SlInput {
	const inputElement = document.createElement("sl-input");
	inputElement.label = "Element";
	inputElement.placeholder = "Elemental Symbol (Cl, O, Au, etc)";
	inputElement.name = "element";
	return inputElement;
}

function createCompoundInput(): SlInput {
	const inputCompound = document.createElement("sl-input");
	inputCompound.label = "Compound";
	inputCompound.placeholder = "Elemental Compound (H2O, etc)";
	inputCompound.name = "compound";
	return inputCompound;
}

function createHUInput(): SlInput {
	const inputHU = document.createElement("sl-input");
	inputHU.label = "Hounsfield Unit";
	inputHU.name = "hu";
	return inputHU;
}

function createMixtureInput(): MixtureInputList {
	const mixturelist = document.createElement("ul", { is: "mixture-input-list" });
	return mixturelist as MixtureInputList;
}

export class MixtureInputList extends HTMLUListElement {
	constructor () {
		super();
		this.addHeaders();
	}

	get elements(): [string, number][] {
		const elements: [string, number][] = [];

		for (let index = 1; index < this.children.length; index++) {
			const row = this.children[index];
			if (!(row instanceof HTMLLIElement)) {
				continue;
			}

			if (row.children.length != 3) {
				continue;
			}
			const element = row.children[1] as SlInput;
			const weight = row.children[2] as SlInput;
			elements.push([element.value, parseFloat(weight.value)]);
		}
		return elements;
	}

	set elements(value: [string, number][]) {
		// remove all mixture items
		this.replaceChildren(...[]);
		this.addHeaders();

		for (let index = 0; index < value.length; index++) {
			const element = value[index][0];
			const weight = value[index][1];
			this.addMixtureItem(element, weight);
		}
	}

	private addHeaders() {
		const listTitle = document.createElement("li");
		const fillerDiv = document.createElement("div");
		const listElementTitle = document.createElement("p");
		const listMixtureTitle = document.createElement("p");
		listElementTitle.textContent = "Element";
		listMixtureTitle.textContent = "Mixture (%)";
		listTitle.appendChild(fillerDiv);
		listTitle.appendChild(listElementTitle);
		listTitle.appendChild(listMixtureTitle);

		this.appendChild(listTitle);
	}

	addMixtureItem(element: string, weight: number) {
		const listItem = document.createElement("li");
		const delMixture = document.createElement("sl-button");
		delMixture.variant = "danger";
		delMixture.type = "button";
		delMixture.onclick = () => {
			listItem.remove();
			if (this.children.length == 1) {
				// First element is headers, so 2nd child is a mixture row.
				this.addMixtureItem("", 100);
			}
		};

		const delMixtureIcon = document.createElement("sl-icon");
		delMixtureIcon.name = "dash";
		delMixture.appendChild(delMixtureIcon);

		const inputElement = createElementInput();
		inputElement.value = element;
		inputElement.label = "";

		const weightUnits = document.createElement("span");
		weightUnits.textContent = "%";
		weightUnits.slot = "suffix";

		const inputWeight = document.createElement("sl-input");
		inputWeight.type = "number";
		inputWeight.min = "0.0";
		inputWeight.min = "100";
		inputWeight.step = 0.01;
		inputWeight.value = weight.toFixed(2);
		inputWeight.appendChild(weightUnits);

		listItem.appendChild(delMixture);
		listItem.appendChild(inputElement);
		listItem.appendChild(inputWeight);
		this.appendChild(listItem);
	}

	remainingPercentage(): number {
		let totalValue = 0;

		for (let index = 1; index < this.children.length; index++) {
			const row = this.children[index];
			if (!(row instanceof HTMLLIElement)) {
				continue;
			}

			if (row.children.length != 3) {
				continue;
			}
			const weight = row.children[2] as SlInput;
			totalValue += parseFloat(weight.value);
		}
		return 100 - totalValue;
	}

	createAddButton(): SlButton {
		const newMixtureButton = document.createElement("sl-button");
		const newMixtureButtonIcon = document.createElement("sl-icon");
		newMixtureButtonIcon.name = "plus";
		newMixtureButton.classList.add("newMixtureEntry");
		newMixtureButton.variant = "success";
		newMixtureButton.appendChild(newMixtureButtonIcon);

		newMixtureButton.onclick = () => {
			let weight = this.remainingPercentage();
			if (weight < 0) {
				weight = 0;
			}
			this.addMixtureItem("", weight);
		};
		return newMixtureButton;
	}

}

function createMaterialForm(rootPanel: HTMLElement, categoryKey: string, materialKey: string) {
	// Create the UI elements for editing a specific material
	const material = MaterialLib[categoryKey][materialKey];

	// Double check to ensure material actually exists...
	if (material === undefined || material === null) {
		console.log("Tried to construct a material that did not exist! '" + categoryKey + "/" + materialKey + "' is not a material within MaterialLib.");
		return;
	}

	const form = document.createElement("form");
	form.classList.add("materialForm");

	// Name
	const inputName = document.createElement("sl-input");
	inputName.label = "Name";
	inputName.placeholder = "A Short alphanumeric name";
	inputName.name = "label";

	// Per-material settings
	const dropdownSettings = document.createElement("sl-dropdown");
	const dropdownMenu = document.createElement("sl-menu");

	// Delete material
	const dropdownDelete = document.createElement("sl-menu-item");
	dropdownDelete.textContent = "Delete Material";
	const dropdownDeleteIcon = document.createElement("sl-icon");
	dropdownDeleteIcon.name = "trash";
	dropdownDeleteIcon.slot = "prefix";
	dropdownDelete.classList.add("danger");
	dropdownDelete.appendChild(dropdownDeleteIcon);
	dropdownDelete.onclick = () => {
		// Delete material
		DeleteMaterial(categoryKey, materialKey);
	};

	dropdownMenu.appendChild(dropdownDelete);
	dropdownSettings.appendChild(dropdownMenu);

	const buttonSettings = document.createElement("sl-icon-button");
	buttonSettings.name = "gear";
	buttonSettings.label = "Material Settings";
	buttonSettings.slot = "trigger";
	const buttonSettingsTooltip = document.createElement("sl-tooltip");
	buttonSettingsTooltip.content = "Material Settings";
	dropdownSettings.appendChild(buttonSettings);

	// Description
	const inputDescription = document.createElement("sl-input");
	inputDescription.label = "Description";
	inputDescription.placeholder = "A brief description of the material";
	inputDescription.classList.add("wide");
	inputDescription.name = "description";

	// Material Type
	const inputType = document.createElement("sl-select");
	inputType.hoist = true;
	inputType.label = "Material Type";
	inputType.name = "type";

	const elementType = document.createElement("sl-menu-item");
	elementType.value = "element";
	elementType.textContent = "Element";

	const compoundType = document.createElement("sl-menu-item");
	compoundType.value = "compound";
	compoundType.textContent = "Compound";

	const mixtureType = document.createElement("sl-menu-item");
	mixtureType.value = "mixture";
	mixtureType.textContent = "Mixture";

	const huType = document.createElement("sl-menu-item");
	huType.value = "hu";
	huType.textContent = "HU Value";

	inputType.appendChild(elementType);
	inputType.appendChild(compoundType);
	inputType.appendChild(mixtureType);
	inputType.appendChild(huType);

	// Density
	const inputDensity = document.createElement("sl-input");
	inputDensity.label = "Density";
	inputDensity.type = "number";
	inputDensity.step = 0.01;
	inputDensity.name = "density";
	const densityUnits = document.createElement("span");
	densityUnits.textContent = "g/cm²";
	densityUnits.slot = "suffix";
	inputDensity.appendChild(densityUnits);

	const divider = document.createElement("sl-divider");

	// Per-type inputs
	const elementDiv = document.createElement("div");
	const inputElement = createElementInput();
	elementDiv.classList.add("element");
	elementDiv.appendChild(inputElement);

	const compoundDiv = document.createElement("div");
	const inputCompound = createCompoundInput();
	compoundDiv.classList.add("compound");
	compoundDiv.appendChild(inputCompound);

	const huDiv = document.createElement("div");
	const inputHU = createHUInput();
	huDiv.classList.add("hu");
	huDiv.appendChild(inputHU);

	// Mixture type
	const mixtureDiv = document.createElement("div");
	const inputMixture = createMixtureInput();
	mixtureDiv.classList.add("mixture");
	mixtureDiv.appendChild(inputMixture);
	mixtureDiv.appendChild(inputMixture.createAddButton());

	// Hidden form control
	const hiddenSave = document.createElement("button");
	hiddenSave.type = "submit";
	hiddenSave.style.display = "none";
	form.onsubmit = () => { return false; };

	// Populate with current settings
	inputName.value = material.label;
	inputDensity.value = material.density + "";
	inputDescription.value = material.description;

	switch (material.material[0]) {
	case "element":
		inputElement.value = material.material[1];
		inputType.value = "element";
		break;
	case "compound":
		inputCompound.value = material.material[1];
		inputType.value = "compound";
		break;
	case "hu":
		inputHU.value = material.material[1] + "";
		inputType.value = "hu";
		break;
	case "mixture":
		inputType.value = "mixture";
		inputMixture.elements = material.material[1];
		break;
	}

	// Hide type sections
	function SelectEvent() {
		if (inputType.value == "element") {
			elementDiv.classList.remove("hidden");
			mixtureDiv.classList.add("hidden");
			compoundDiv.classList.add("hidden");
			huDiv.classList.add("hidden");
			inputDensity.classList.remove("hidden");
		} else if (inputType.value == "mixture") {
			elementDiv.classList.add("hidden");
			mixtureDiv.classList.remove("hidden");
			compoundDiv.classList.add("hidden");
			huDiv.classList.add("hidden");
			inputDensity.classList.remove("hidden");
		} else if (inputType.value == "compound") {
			elementDiv.classList.add("hidden");
			mixtureDiv.classList.add("hidden");
			compoundDiv.classList.remove("hidden");
			huDiv.classList.add("hidden");
			inputDensity.classList.remove("hidden");
		} else if (inputType.value == "hu") {
			elementDiv.classList.add("hidden");
			mixtureDiv.classList.add("hidden");
			inputDensity.classList.add("hidden");
			compoundDiv.classList.add("hidden");
			huDiv.classList.remove("hidden");
		}
	}
	inputType.addEventListener("sl-change", SelectEvent);
	SelectEvent();

	// Build form
	form.appendChild(hiddenSave);
	form.appendChild(dropdownSettings);
	form.appendChild(inputName);
	form.appendChild(inputDescription);
	form.appendChild(inputType);
	form.appendChild(divider);
	form.appendChild(inputDensity);
	form.appendChild(elementDiv);
	form.appendChild(compoundDiv);
	form.appendChild(huDiv);
	form.appendChild(mixtureDiv);
	rootPanel.appendChild(form);
}

function createMaterialPanel(tabGroup: SlTabGroup, categoryKey: string, materialKey: string) {
	// Create tab and panel of a material
	const material = MaterialLib[categoryKey][materialKey];

	// Double check to ensure material actually exists...
	if (material === undefined || material === null) {
		console.log("Tried to construct a material that did not exist! '" + categoryKey + "/" + materialKey + "' is not a material within MaterialLib.");
		return;
	}

	const materialTab = document.createElement("sl-tab");
	const materialPanel = document.createElement("sl-tab-panel");
	materialTab.slot = "nav";
	materialTab.panel = material.label;
	materialTab.textContent = material.label;
	materialTab.setAttribute("materialid", materialKey);

	materialPanel.name = material.label;

	createMaterialForm(materialPanel, categoryKey, materialKey);
	tabGroup.append(materialTab);
	tabGroup.append(materialPanel);
}

function createCategoryPanel(rootPanel: HTMLElement, categoryKey: string, blank=false) {
	const category = MaterialLib[categoryKey];
	if (Object.keys(category).length == 0 && !blank) {
		console.log("No material in category " + categoryKey);
		return;
	}
	const categoryTab = document.createElement("sl-tab");
	categoryTab.slot = "nav";
	categoryTab.panel = categoryKey;
	categoryTab.textContent = categoryKey;
	categoryTab.setAttribute("catid", categoryKey);

	const categoryPanel = document.createElement("sl-tab-panel");
	categoryPanel.name = categoryKey;

	const categoryMaterialGroup = document.createElement("sl-tab-group");
	categoryMaterialGroup.placement = "start";

	for (const materialKey in category) {
		console.log("Processing material " + categoryKey + "/" + materialKey);
		if (Object.prototype.hasOwnProperty.call(category, materialKey)) {
			createMaterialPanel(categoryMaterialGroup, categoryKey, materialKey);
		}
	}

	// Create an add material button for adding categories
	const addMaterialButton = document.createElement("sl-button");
	addMaterialButton.slot = "nav";
	addMaterialButton.size = "small";
	addMaterialButton.outline = true;
	addMaterialButton.circle = true;
	addMaterialButton.type = "button";
	const materialPlusIcon = document.createElement("sl-icon");
	materialPlusIcon.name = "plus";
	addMaterialButton.appendChild(materialPlusIcon);
	addMaterialButton.onclick = () => {
		// Create a default material
		console.log("category");
		console.log(category);
		const matName = ("Material" + (Object.keys(category).length+1)).toLowerCase();
		const newMaterial: Material = {
			label: matName,
			density: 1.0,
			description: "",
			material: ["element", "C"]
		};
		MaterialLib[categoryKey][matName] = newMaterial;

		// Remove button from tab group panel first
		categoryMaterialGroup.lastChild?.remove();

		// Add new material
		createMaterialPanel(categoryMaterialGroup, categoryKey, matName);

		// Re-add button and select new material
		categoryMaterialGroup.appendChild(addMaterialButton);
		setSelectedMaterial(categoryKey, matName);
	};

	// Build
	categoryPanel.append(categoryMaterialGroup);
	categoryMaterialGroup.appendChild(addMaterialButton);
	rootPanel.appendChild(categoryTab);
	rootPanel.appendChild(categoryPanel);
}

export function getSelectedMaterial(): [string, string, HTMLFormElement?] {
	// bug: if sample has changed its ID and the UI hasn't been updated, the old ID is used, causing a not-found issue later on.
	// This can be fixed by doing a UI refresh before running this function, as done in 
	const catID = (document.querySelector("#tabMaterial > sl-tab[active]") as unknown as SlTab).getAttribute("catID");
	const matID = (document.querySelector("#tabMaterial > sl-tab-panel[active] > sl-tab-group > sl-tab[active]") as unknown as SlTab).getAttribute("materialid");
	const form = document.querySelector("#tabMaterial > sl-tab-panel[active] > sl-tab-group > sl-tab-panel[active] > form") as HTMLFormElement;

	if (catID == null || MaterialLib[catID] == undefined) {
		throw "Unknown category ID for material selection '"+catID+"'"
	} else if (matID == null || MaterialLib[catID][matID] == undefined) {
		throw "Unknown material ID in '"+catID+"' for material selection '"+matID+"'"
	}

	return [catID, matID, form];
}

export function setSelectedMaterial(catID: string, matID: string) {
	const catTabs = document.querySelectorAll("#tabMaterial > sl-tab") as NodeListOf<SlTab>;
	const catGroup = document.querySelector("#tabMaterial") as SlTabGroup;
	let catPanel: SlTabPanel | null | undefined;

	for (let index = 0; index < catTabs.length; index++) {
		const tab = catTabs[index];
		console.log(tab.getAttribute("catid"));
		if (tab.getAttribute("catid") == catID) {
			catPanel = catGroup.querySelector("sl-tab-panel[name='" + tab.panel + "'") as SlTabPanel;

			// Ensure tab and panels are synced, especially just after adding
			// new tabs and selecting them.
			catGroup.requestUpdate();
			catGroup.syncTabsAndPanels();
			catGroup.setActiveTab(tab, { emitEvents: true, scrollBehavior: "smooth" });
			break;
		}
	}

	if (catPanel === undefined || catPanel == null) {
		return;
	}

	const matGroup = catPanel.querySelector("sl-tab-group") as SlTabGroup;
	const matTabs = catPanel.querySelectorAll("sl-tab-group > sl-tab") as NodeListOf<SlTab>;
	for (let index = 0; index < matTabs.length; index++) {
		const tab = matTabs[index];
		if (tab.getAttribute("materialid") == matID) {
			// Ensure tab and panels are synced, especially just after adding
			// new tabs and selecting them.
			matGroup.requestUpdate();
			matGroup.syncTabsAndPanels();

			matGroup.setActiveTab(tab, { emitEvents: true, scrollBehavior: "smooth" });
			break;
		}
	}
}

export function updateMaterialDialog(MaterialTab: SlTabGroup): void {
	console.log("updateMaterialDialog");
	console.log("MaterialLibrary has " + Object.keys(MaterialLib).length + " keys.");

	MaterialTab.replaceChildren(...[]);

	for (const categoryKey in MaterialLib) {
		if (Object.prototype.hasOwnProperty.call(MaterialLib, categoryKey)) {
			console.log("Processing " + categoryKey);
			createCategoryPanel(MaterialTab, categoryKey);
		}
	}

	const addCategoryButton = document.createElement("sl-button");
	addCategoryButton.slot = "nav";
	addCategoryButton.size = "small";
	addCategoryButton.outline = true;
	addCategoryButton.circle = true;
	addCategoryButton.type = "button";
	addCategoryButton.onclick = () => {
		MaterialDialog.hide();
		CategoryDialog.show();
	};

	// Create an event listener to respond from the new category dialog
	window.addEventListener("newCategory", (e) => {
		const event = (e as EventNewCategory).detail;
		console.log(e);
		console.log(event);

		if (Object.prototype.hasOwnProperty.call(MaterialLib, event.name)) {
			// Attempting to create an already existing category.
			// Check to see if the category has any materials
			if (Object.keys(MaterialLib[event.name]).length > 0) {
				// Material category has materials, switch to it instead.
				setSelectedMaterial(event.name, "");
				return;
			}

			// If the category exists, but has no materials, it won't have a
			// panel due to previous updates on the material dialogue.
			// In this case, the normal approach to making new categories works fine.
		}

		MaterialLib[event.name] = {"material1":{
			label: "material1",
			density: 1.0,
			description: "",
			material: ["element", "C"]
		}};

		updateMaterialDialog(MaterialTab);
		setSelectedMaterial(event.name, "");
	});

	const categoryPlusIcon = document.createElement("sl-icon");
	categoryPlusIcon.name = "plus";

	addCategoryButton.appendChild(categoryPlusIcon);
	MaterialTab.appendChild(addCategoryButton);
	return;
}

document.addEventListener("DOMContentLoaded", function () {
	let app_data = {};
	let next_spot = 0;
	let general_tasks;

// Region Helper ==========================================================
	function unhyphenatedName(name) { return name.replaceAll("-", " ") }
	const delay = ms => new Promise(res => setTimeout(res, ms));
// End Region Helper ======================================================


// Region DataFunctions ===============================================================
	function getData() {
		fetch("static/data.json")
			.then((res) => {
				return res.json();
			})
			.then((res) => {
				app_data = res;
				refreshPage(res);
			})
	}

	function saveData(data) {
		console.log("Saving data");
		const formdata = new FormData();
		formdata.append("data", JSON.stringify(data));

		fetch("/savedata", {
			method: "POST",
			body: formdata,
		})
			.then((res) => res.text())
			.then((res) => console.log(res))
	}

	function reconcileTaskSpots(delete_spot) {
		for (const category_ in app_data["categories"]) {
			for (const idx_ in app_data["categories"][category_]) {
				const project_ = app_data["categories"][category_][idx_];
				
				for (const task_ of project_["tasks_todo"]) {
					task_["spot"] = task_["spot"] >= delete_spot ? task_["spot"] - 1: task_["spot"];
				}
			}
		}
	}

	function assignTaskSpot(category, idx, assign_task, spot) {
		for (const task of app_data["categories"][category][idx]["tasks_todo"]) {
			if (task["task"] == assign_task) {
				task["spot"] = spot;
			}
		}
	}

	function submitProjectTask() {
		const cat_proj = document.querySelector("#add_project_task_popup").getAttribute("description").split("_");
		const task = document.querySelector("#add_project_task_name").value;
		document.querySelector("#add_project_task_name").value = "";
		const category = cat_proj[0];
		const project = cat_proj[1];
		const idx = cat_proj[2]
		
		console.log(app_data["categories"][unhyphenatedName(category)][idx]["tasks_todo"]);
		for (const item of app_data["categories"][unhyphenatedName(category)][idx]["tasks_todo"]) {
			console.log(item);
			if (item["task"] == task) {
				alert("Dupe task");
				return;
			}
		}
		app_data["categories"][unhyphenatedName(category)][idx]["tasks_todo"].push({"task": task, "spot": 0, "priority": 1, "date": null});
		refreshPage(app_data);
		saveData(app_data);
		closePopup();
	}

	function addCategorySubmit() {
		const new_cat_name = document.querySelector("#add_category_name").value;
		if (!(new_cat_name in app_data["categories"]))
			app_data["categories"][new_cat_name] = {};
		document.querySelector("#add_category_name").value = "";
		refreshPage(app_data);
		saveData(app_data);
	}

	function promoteGeneralTask(e) {
		const lower_spot = e.srcElement.id.split("_")[1];
		if (lower_spot == 1) return;
		const upper_spot = lower_spot - 1;

		const lower_category = general_tasks[lower_spot]["category-project"].split("-")[0];
		const lower_project = general_tasks[lower_spot]["category-project"].split("-")[1];
		const lower_task = general_tasks[lower_spot]["task"];
		const lower_idx = general_tasks[lower_spot]["idx"];

		const upper_category = general_tasks[upper_spot]["category-project"].split("-")[0];
		const upper_project = general_tasks[upper_spot]["category-project"].split("-")[1];
		const upper_task = general_tasks[upper_spot]["task"];
		const upper_idx = general_tasks[upper_spot]["idx"];

		assignTaskSpot(lower_category, lower_idx, lower_task, upper_spot);
		assignTaskSpot(upper_category, upper_idx, upper_task, lower_spot);

		refreshPage(app_data);
		saveData(app_data);
	}

	function updateSchema() {
		for (const _cat in app_data["categories"]) {
			for (const _proj in app_data["categories"][_cat]) {
				
				if (!("notes" in app_data["categories"][_cat][_proj])) {
					app_data["categories"][_cat][_proj]["notes"] = "";
				}
				if (!("priority" in app_data["categories"][_cat][_proj])) {
					app_data["categories"][_cat][_proj]["priority"] = 1;
				}
				if (!("folded" in app_data["categories"][_cat][_proj])) {
					app_data["categories"][_cat][_proj]["folded"] = false;
				}

				for (const item in app_data["categories"][_cat][_proj]["tasks_todo"]) {
					if (!("date" in app_data["categories"][_cat][_proj]["tasks_todo"][item]))  {
						app_data["categories"][_cat][_proj]["tasks_todo"][item]["date"] = null;
					}
				}
			}
		}
		saveData(app_data);
	}

	function saveNote() {
		const note = document.querySelector("#project_notes_input").value;
		const description = document.querySelector("#add_project_task_popup").getAttribute("description").split("_");
		const category = description[0];
		const idx = description[2];


		app_data["categories"][unhyphenatedName(category)][idx]["notes"] = note;
		saveData(app_data);
		refreshPage(app_data);
	}

	function projectShift(e) {
		const left = e.srcElement.id.includes("left");
		const idx = e.srcElement.parentElement.getAttribute("description").split("_")[2];
		const category = unhyphenatedName(e.srcElement.parentElement.getAttribute("description").split("_")[0]);

		if (left) {
			// Check if current IDX is 0, if so just reject
			if (idx == 0) return;
			const temp1 = app_data["categories"][category][idx];
			const temp2 = app_data["categories"][category][idx - 1];
			

			app_data["categories"][category][idx] = temp1;
			app_data["categories"][category][idx - 1] = temp2;
			
			delete app_data["categories"][category][idx - 1];
			delete app_data["categories"][category][idx];
			
			app_data["categories"][category][idx] = temp2;
			app_data["categories"][category][idx - 1] = temp1;
		}
		else {
			// Check if current IDX is largest IDX in category, if so just reject
			const highest_idx = Math.max(...Object.keys(app_data["categories"][category]).map(Number));
			if (idx == highest_idx) return;
			const temp1 = app_data["categories"][category][idx];
			const temp2 = app_data["categories"][category][Number(idx) + 1];

			delete app_data["categories"][category][idx];
			delete app_data["categories"][category][Number(idx) + 1];

			app_data["categories"][category][idx] = temp2;
			app_data["categories"][category][Number(idx) + 1] = temp1;

		}
		saveData(app_data);
		refreshPage(app_data);
		closePopup();
	}

	function projectPriorityTask(e) {
		const priority_val = e.srcElement.value == "Low" ? 1 : e.srcElement.value == "Medium" ? 2 : 3;
		const category = unhyphenatedName(e.srcElement.parentElement.getAttribute("description").split("_")[0]);
		const idx = e.srcElement.parentElement.getAttribute("description").split("_")[2];

		app_data["categories"][category][idx]["priority"] = priority_val;		
		saveData(app_data);
		refreshPage(app_data);
		closePopup();
	}

	function saveTaskDate(category, project, idx, task, date) {
		for (const item in app_data["categories"][category][idx]["tasks_todo"]) {
			if (app_data["categories"][category][idx]["tasks_todo"][item]["task"] == task) {
				app_data["categories"][category][idx]["tasks_todo"][item]["date"] = date;
			}
		}
		saveData(app_data);
		refreshPage(app_data);
	}
// End Region DataFunctions ===========================================================

// Region PageActions =================================================================
	function updateTaskDate(e) {
		const info = e.srcElement.parentElement;
		const category = info.getAttribute("data-category");
		const project = info.getAttribute("data-project");
		const idx = info.getAttribute("data-idx");
		const task = info.getAttribute("data-task");
		const val = document.querySelector("#task_date").value;
		if (val == "") {
			saveTaskDate(category, project, idx, task, null);
		}
		else {
			saveTaskDate(category, project, idx, task, val);
		}
	}

	async function deleteFinishedTask(e) {
		const info = e.srcElement.parentElement;
		const delete_spot = info.getAttribute("data-spot");
		const category = info.getAttribute("data-category");
		const project = info.getAttribute("data-project");
		const idx = info.getAttribute("data-idx");
		const task = info.getAttribute("data-content");

		app_data["categories"][category][idx]["tasks_done"].push(task);

		let opacity_val = 1;
		while (opacity_val > 0) {
			e.srcElement.parentElement.style.opacity = opacity_val;
			await delay(5);
			opacity_val -= 0.01;
		}
		
		let i = 0;
		while (i < app_data["categories"][category][idx]["tasks_todo"].length) {
			if (app_data["categories"][category][idx]["tasks_todo"][i]["task"] == task) {
				app_data["categories"][category][idx]["tasks_todo"].splice(i, 1);
			}
			i++;
		}

		reconcileTaskSpots(delete_spot);
		
		refreshPage(app_data, delete_spot);
		saveData(app_data);
	}

	function addProjectButton(e) {
		const category = e.srcElement.parentElement.parentElement.id.split("_")[1];
		document.querySelector("#popup_project_text").innerText = `Add project to category: ${category}`;
		document.querySelector("#add_project_popup").setAttribute("description", category);
		openCategoryPopup();
	}

	function addProjectSubmit() {
		const category = document.querySelector("#add_project_popup").getAttribute("description");
		const project = document.querySelector("#add_project_name").value;
		document.querySelector("#add_project_name").value = "";
		closePopup();
		const project_key = Object.keys(app_data["categories"][unhyphenatedName(category)]).length;
		app_data["categories"][unhyphenatedName(category)][project_key] = {"project": project, "tasks_todo": [], "tasks_done": [], "notes": "", "priority": 1, "folded": false};
		refreshPage(app_data);
		saveData(app_data);
	}

	function openTaskPopup(task, priority, category, project, idx, on_general, spot, date) {
		const task_selected_div = document.querySelector("#task_selected");
		task_selected_div.style.display =  "block";
		document.querySelector("#panel_popup").style.display = "block";
		document.querySelector("#task_info").innerText = `Selected task: ${task}`;
		document.querySelector("#task_priority").value = priority == 3 ? "High" : priority == 2 ? "Medium" : "Low";
		task_selected_div.setAttribute("data-task", task);
		task_selected_div.setAttribute("data-category", category);
		task_selected_div.setAttribute("data-project", project);
		task_selected_div.setAttribute("data-idx", idx);
		task_selected_div.setAttribute("data-on-general", on_general);
		task_selected_div.setAttribute("data-spot", spot);
		document.querySelector("#task_date").value = date;
	}

	function onOffGeneralToggle() {
		const task_popup_elem = document.querySelector("#task_selected");
		const task = task_popup_elem.getAttribute("data-task");
		const category = task_popup_elem.getAttribute("data-category");
		const project = task_popup_elem.getAttribute("data-project");
		const idx = task_popup_elem.getAttribute("data-idx");
		const on_general = task_popup_elem.getAttribute("data-on-general") == "false" ? false : true;
		const spot = task_popup_elem.getAttribute("data-spot");


		if (!on_general) {
			app_data["categories"][category][idx]["tasks_todo"].forEach(item => 
				item["task"] == task && item["spot"] == 0 ? item["spot"] = parseInt(general_tasks["highest"]) + 1 : item["spot"] = item["spot"]);
		}
		else {
			app_data["categories"][category][idx]["tasks_todo"].forEach(item => 
				item["task"] == task && item["spot"] != 0 ? item["spot"] = 0 : item["spot"] = item["spot"]);
			reconcileTaskSpots(spot);
		}
		

		refreshPage(app_data);
		saveData(app_data);
		closePopup();
	}

	function taskPriorityToggle(obj) {
		
		const new_priority = obj.target.value == "High" ? 3 : obj.target.value == "Medium" ? 2 : 1;
		const parent = obj.srcElement.parentElement;
		const category = parent.getAttribute("data-category");
		const idx = parent.getAttribute("data-idx");
		const task = parent.getAttribute("data-task");



		app_data["categories"][category][idx]["tasks_todo"].forEach(item => 
				item["task"] == task ? item["priority"] = new_priority : item["priority"] = item["priority"]);

		refreshPage(app_data);
		saveData(app_data);
		closePopup();
	}

	function selectTask(e) {
		// Turn this into a popup
		// if put onto general list run this anyways as well

		const parent_elem = e.srcElement.parentElement.parentElement;
		const info = parent_elem.id.split("_");
		const task = e.srcElement.getAttribute("data-task");
		const category = unhyphenatedName(info[1]);
		const project = unhyphenatedName(info[2]);
		const idx = parent_elem.getAttribute("idx");
		const priority = e.srcElement.getAttribute("data-priority");
		const spot = e.srcElement.getAttribute("data-spot") || 0;
		const date = e.srcElement.getAttribute("data-date") || 0;

		const on_general = [...e.srcElement.classList].includes("on_general");

		
		openTaskPopup(task, priority, category, project, idx, on_general, spot, date);
	}	

	function deleteProject() {
		const info = document.querySelector("#add_project_task_popup").getAttribute("description").split("_");
		const category = unhyphenatedName(info[0]);
		const idx = info[2];
		delete app_data["categories"][category][idx];
		closePopup();
		refreshPage(app_data);
		saveData(app_data);
	}

	function deleteCategory() {
		const info = document.querySelector("#add_project_popup").getAttribute("description");
		const category = unhyphenatedName(info);
		delete app_data["categories"][category];
		closePopup();
		refreshPage(app_data);
		saveData(app_data);
	}

	function openProjectTaskPopup(e) {
		document.querySelector("#add_project_task_popup").style.display =  "block";
		document.querySelector("#panel_popup").style.display = "block";
		document.querySelector("#add_project_task_name").focus();

		
		const parent_elem = e.srcElement.parentElement.parentElement;

		const project = parent_elem.id.split("_")[2];
		const category = parent_elem.id.split("_")[1];
		const idx = parent_elem.getAttribute("idx");


		const tasks_done = app_data["categories"][unhyphenatedName(category)][idx]["tasks_done"];
		for (const task of tasks_done) {
			const temp = document.createElement("li");
			temp.innerText = task;
			document.querySelector("#completed_tasks_list").appendChild(temp);
		}

		const notes = app_data["categories"][unhyphenatedName(category)][idx]["notes"];
		document.querySelector("#project_notes_input").value = notes;

		const priority = app_data["categories"][unhyphenatedName(category)][idx]["priority"];
		document.querySelector("#project_priority").value = priority == 3 ? "High" : priority == 2 ? "Medium" : "Low";

		document.querySelector("#popup_project_task_text").innerText = `Add task to project: ${project}`;
		document.querySelector("#add_project_task_popup").setAttribute("description", `${category}_${project}_${idx}`);
	}

	function openCategoryPopup () {
		document.querySelector("#add_project_popup").style.display =  "block";
		document.querySelector("#panel_popup").style.display = "block";
	};

	function closePopup() {
		document.querySelector("#panel_popup").style.display = "none";
		document.querySelector("#add_category_popup").style.display =  "none";
		document.querySelector("#add_project_popup").style.display =  "none";
		document.querySelector("#add_project_task_popup").style.display =  "none";
		document.querySelector("#task_selected").style.display =  "none";

		const completed_list = document.querySelector("#completed_tasks_list");
		while (completed_list.children.length > 0) {
			completed_list.children[0].remove();
		}
	}

	async function toggleProjectTaskView(e) {
		const project = e.srcElement.parentElement.parentElement;
		const q_select = project.id;
		const target_elem = document.querySelector(`#${q_select} > div.project_task_container`);
		const speed = 5;
		
		
		if (target_elem.hasAttribute("rolled_up")) {
			target_elem.style.height = `100%`;
			const goal_height = target_elem.offsetHeight;
			target_elem.style.height = 0;
			const increment = goal_height / 100;
			let i = 0;
			
			while (i < goal_height) {
				await delay(speed);
				target_elem.style.height = `${i}px`;
				i += increment;
			}

			target_elem.removeAttribute("rolled_up");
		}
		else {
			let i = target_elem.offsetHeight;
			const increment = i / 100;
			while (i > 0) {
				await delay(speed);
				target_elem.style.height = `${i}px`;
				i -= increment;
			}
			target_elem.style.height = 0;
			target_elem.setAttribute("rolled_up", "");
		}
	}
// Region End PageActions ===============================================================	

// Region PageBuild ====================================================================
	function createGeneralTask(text, category_project, spot, idx, priority) {
		const div = document.createElement("div");
		div.addEventListener("mouseover", function () {
			document.querySelector(`#promote_${spot}`).style.display = "block";
		});
		div.addEventListener("mouseout", function () {
			document.querySelector(`#promote_${spot}`).style.display = "none";
		});

		div.classList.add("general_task");
		if (priority == 3)
			div.classList.add("high_priority_general");
		else if (priority == 2)
			div.classList.add("medium_priority_general");
		const category = category_project.split("-")[0];
		const project = category_project.split("-")[1];
		div.setAttribute("data-category", category);
		div.setAttribute("data-project", project);
		div.setAttribute("data-spot", spot);
		div.setAttribute("data-idx", idx);
		div.setAttribute("data-content", text);
		div.setAttribute("priority", priority);
		

		const checkbox = document.createElement("input");
		checkbox.name = "task_complete";
		checkbox.setAttribute("type", "checkbox");
		checkbox.classList.add("general_task_checkbox");
		checkbox.addEventListener("click", deleteFinishedTask);

		const promote_btn = document.createElement("button");
		promote_btn.addEventListener("click", promoteGeneralTask);
		promote_btn.innerHTML = '&#8593;';
		promote_btn.classList.add("promote_btn");
		promote_btn.id = `promote_${spot}`;

		const task_text_div = document.createElement("div");
		task_text_div.classList.add("general_task_text");
		const task_text = document.createElement("p");
		task_text.innerText = text;
		const task_category = document.createElement("p");
		task_category.innerText = category_project;
		task_text_div.appendChild(task_text);
		task_text_div.appendChild(task_category);

		div.appendChild(checkbox);
		div.appendChild(task_text_div);
		div.appendChild(promote_btn);
		document.querySelector("#task_container").appendChild(div);
	}

	function createCategory(category) {
		const main_div = document.createElement("div");
		main_div.classList.add("individual_category");
		main_div.id = `cat_${category.replaceAll(" ", "-")}`;
		

		const category_header = document.createElement("p");
		category_header.classList.add("category_header");
		category_header.innerText = category;

		const category_content = document.createElement("div");
		category_content.classList.add("category_content");
		category_content.id = `cat_${category.replaceAll(" ", "-")}_content`;

		const add_project_btn = document.createElement("button");
		add_project_btn.innerHTML = "Add project";
		add_project_btn.addEventListener("click", addProjectButton);
		category_header.appendChild(add_project_btn);
		

		main_div.appendChild(category_header);
		main_div.appendChild(category_content);
		document.querySelector("#category_container").appendChild(main_div);
	}



	function createProject(project, category, idx, notes, priority) {
		const project_div = document.createElement("div");
		project_div.classList.add("project_container");
		project_div.id = `cat_${category.replaceAll(" ", "-")}_${project.replaceAll(" ", "-")}`;
		project_div.setAttribute("idx", idx);
		if (priority == 2) {
			project_div.classList.add("project_priority_medium");
		}
		else if (priority == 3) {
			project_div.classList.add("project_priority_high");
		}

		const project_title = document.createElement("span");
		project_title.innerText = project;
		project_title.classList.add("project_title");
		project_title.addEventListener("click", openProjectTaskPopup);

		const fold_toggle = document.createElement("button");
		fold_toggle.classList.add("fold_toggle");
		fold_toggle.innerHTML = "&#8675;";
		fold_toggle.addEventListener("click", toggleProjectTaskView);

		const header_div = document.createElement("div");
		header_div.classList.add("project_header");
		header_div.appendChild(project_title);
		header_div.appendChild(fold_toggle);



		const task_div = document.createElement("div");
		task_div.classList.add("project_task_container");

		project_div.appendChild(header_div);

		if (notes.length > 0) {
			const notes_div = document.createElement("div");
			notes_div.classList.add("notes_div");
			notes_div.innerText = notes;
			project_div.appendChild(notes_div);	
		}

		project_div.appendChild(task_div);

		document.querySelector(`#cat_${category.replaceAll(" ", "-")}_content`).appendChild(project_div);
	}



	function addProjectTask(category, project, task, spot, priority, date) {
		const task_div = document.createElement("li");
		task_div.classList.add("project_task");
		if (priority == 3) task_div.classList.add("high_priority");
		else if (priority == 2) task_div.classList.add("medium_priority");
		if (spot != 0) {
			task_div.classList.add("on_general");
			task_div.setAttribute("data-spot", spot);
		}
		task_div.setAttribute("data-priority", priority);
		task_div.setAttribute("data-date", date);
		task_div.addEventListener("click", selectTask);
		task_div.setAttribute("data-task", task);
		const date_part = date != null ? `${date} - ` : "";
		task_div.innerText = date_part + task;

		const parent_id = `cat_${category.replaceAll(" ", "-")}_${project.replaceAll(" ", "-")}`;
		
		document.querySelector(`#${parent_id} > div.project_task_container`).appendChild(task_div);
	}
// Region End PageBuild ================================================================

	function refreshPage(data) {
		const existing_tasks = document.getElementsByClassName("general_task");
		let counter = 0;
		while (counter < existing_tasks.length) {
			existing_tasks[counter].remove();
		}
		const existing_categories = document.getElementsByClassName("individual_category");
		counter = 0;
		while (counter < existing_categories.length) {
			existing_categories[counter].remove();
		}

		
		general_tasks = {"highest": 0};
		
		for (const category in data["categories"]) {
			createCategory(category);
			const projects = data["categories"][category];

			for (const idx in projects) {
				const project = projects[idx]["project"];
				const tasks = projects[idx]["tasks_todo"];
				const notes = projects[idx]["notes"];
				const priority = projects[idx]["priority"];
				createProject(project, category, idx, notes, priority);
				for (const task of tasks) {
					addProjectTask(category, project, task["task"], task["spot"], task["priority"], task["date"]);
					const spot = task["spot"];
					if (spot > 0) {
						general_tasks["highest"] = general_tasks["highest"] < spot ? spot : general_tasks["highest"];
						general_tasks[spot] = {
							"task": task["task"],
							"category-project": `${category}-${project}`,
							"spot": spot,
							"idx": idx,
							"priority": task["priority"]
						};
					}
				}	
			}
		}

		let i = 1;
		while (i <= general_tasks["highest"]) {
			createGeneralTask(general_tasks[i]["task"], general_tasks[i]["category-project"], 
				general_tasks[i]["spot"], general_tasks[i]["idx"], general_tasks[i]["priority"]);
			i++;
		}
	}


// Region EventListeners
	document.querySelector("#save_note_btn").addEventListener("click", saveNote);
	document.querySelector("#delete_project_btn").addEventListener("click", deleteProject);
	document.querySelector("#delete_category_btn").addEventListener("click", deleteCategory);

	document.querySelector("#add_project_submit").addEventListener("click", addProjectSubmit);

	document.querySelector("#add_task_to_general").addEventListener("click", onOffGeneralToggle);
	document.querySelector("#task_priority").onchange = taskPriorityToggle;
	document.querySelector("#project_priority").onchange = projectPriorityTask;


	document.querySelector("#add_category_query").addEventListener("click", function () {
		document.querySelector("#add_category_popup").style.display =  "block";
		document.querySelector("#panel_popup").style.display = "block";
	});


	document.querySelector("#close_popup_btn").addEventListener("click", closePopup);
	document.querySelector("#add_project_task_submit").addEventListener("click", submitProjectTask);

	document.querySelector("#add_category_submit").addEventListener("click", addCategorySubmit);

	document.querySelector("#update_schema_query").addEventListener("click", updateSchema);
	document.querySelector("#project_left_btn").addEventListener("click", projectShift);
	document.querySelector("#project_right_btn").addEventListener("click", projectShift);

	document.querySelector("#task_date").addEventListener("change", updateTaskDate);
// Region End EventListeners

	getData();
});


document.addEventListener("DOMContentLoaded", function () {
	let app_data = {};
	let next_spot = 0;
	let general_tasks;

	function unhyphenatedName(name) { return name.replaceAll("-", " ") }
	const delay = ms => new Promise(res => setTimeout(res, ms));

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

	async function deleteFinishedTask(e) {
		const info = e.srcElement.parentElement;
		const delete_spot = info.getAttribute("data-spot");
		const category = info.getAttribute("data-category");
		const project = info.getAttribute("data-project");
		const idx = info.getAttribute("data-idx");
		const task = info.getAttribute("data-content");


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

		for (const category_ in app_data["categories"]) {
			for (const idx_ in app_data["categories"][category_]) {
				const project_ = app_data["categories"][category_][idx_];
				
				for (const task_ of project_["tasks_todo"]) {
					task_["spot"] = task_["spot"] >= delete_spot ? task_["spot"] - 1: task_["spot"];
				}
			}
			
		}
		
		refreshPage(app_data, delete_spot);
		saveData(app_data);
	}

	function createGeneralTask(text, category_project, spot, idx) {
		const div = document.createElement("div");
		div.classList.add("general_task");
		const category = category_project.split("-")[0];
		const project = category_project.split("-")[1];
		div.setAttribute("data-category", category);
		div.setAttribute("data-project", project);
		div.setAttribute("data-spot", spot);
		div.setAttribute("data-idx", idx);
		div.setAttribute("data-content", text);
		

		const checkbox = document.createElement("input");
		checkbox.name = "task_complete";
		checkbox.setAttribute("type", "checkbox");
		checkbox.classList.add("general_task_checkbox");
		checkbox.addEventListener("click", deleteFinishedTask);

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
		document.querySelector("#task_container").appendChild(div);
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
		app_data["categories"][unhyphenatedName(category)][project_key] = {"project": project, "tasks_todo": []};
		refreshPage(app_data);
		saveData(app_data);
		
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



	function createProject(project, category, idx) {
		const project_div = document.createElement("div");
		project_div.classList.add("project_container");
		project_div.id = `cat_${category.replaceAll(" ", "-")}_${project.replaceAll(" ", "-")}`;
		project_div.setAttribute("idx", idx);

		const project_title = document.createElement("p");
		project_title.innerText = project;
		project_title.classList.add("project_title");
		project_title.addEventListener("click", openProjectTaskPopup);

		project_div.appendChild(project_title);


		document.querySelector(`#cat_${category.replaceAll(" ", "-")}_content`).appendChild(project_div);
	}

	function selectTask(e) {
		const info = e.srcElement.parentElement.id.split("_");
		const task = e.srcElement.innerText;
		const category = unhyphenatedName(info[1]);
		const project = unhyphenatedName(info[2]);
		const idx = e.srcElement.parentElement.getAttribute("idx");

		
		app_data["categories"][category][idx]["tasks_todo"].forEach(item => 
			item["task"] == task && item["spot"] == 0 ? item["spot"] = general_tasks["highest"] + 1 : item["spot"] = item["spot"]);
		refreshPage(app_data);
		saveData(app_data);
		
	}

	function addProjectTask(category, project, task, on_general) {
		const task_div = document.createElement("div");
		task_div.classList.add("project_task");
		if (on_general)
			task_div.classList.add("on_general");
		task_div.addEventListener("click", selectTask);
		task_div.innerText = task;

		const parent_id = `cat_${category.replaceAll(" ", "-")}_${project.replaceAll(" ", "-")}`
		document.querySelector(`#${parent_id}`).appendChild(task_div);
	}

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
				createProject(project, category, idx);
				for (const task of tasks) {
					addProjectTask(category, project, task["task"], task["spot"] != 0);
					const spot = task["spot"];
					if (spot > 0) {
						general_tasks["highest"] = general_tasks["highest"] < spot ? spot : general_tasks["highest"];
						general_tasks[spot] = {
							"task": task["task"],
							"category-project": `${category}-${project}`,
							"spot": spot,
							"idx": idx
						};
					}
				}	
			}
		}

		let i = 1;
		while (i <= general_tasks["highest"]) {
			createGeneralTask(general_tasks[i]["task"], general_tasks[i]["category-project"], 
				general_tasks[i]["spot"], general_tasks[i]["idx"]);
			i++;
		}
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
		console.log(info);
		const category = unhyphenatedName(info);
		delete app_data["categories"][category];
		closePopup();
		refreshPage(app_data);
		saveData(app_data);
	}

	document.querySelector("#delete_project_btn").addEventListener("click", deleteProject);
	document.querySelector("#delete_category_btn").addEventListener("click", deleteCategory);

	document.querySelector("#add_project_submit").addEventListener("click", addProjectSubmit);

	document.querySelector("#add_category_query").addEventListener("click", function () {
		document.querySelector("#add_category_popup").style.display =  "block";
		document.querySelector("#panel_popup").style.display = "block";
	});

	function openProjectTaskPopup(e) {
		document.querySelector("#add_project_task_popup").style.display =  "block";
		document.querySelector("#panel_popup").style.display = "block";
		document.querySelector("#add_project_task_name").focus();

		const project = e.srcElement.parentElement.id.split("_")[2];
		const category = e.srcElement.parentElement.id.split("_")[1];
		const idx = e.srcElement.parentElement.getAttribute("idx");

		document.querySelector("#popup_project_task_text").innerText = `Add task to project: ${project}`;
		document.querySelector("#add_project_task_popup").setAttribute("description", `${category}_${project}_${idx}`)
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
	}

	function submitProjectTask() {
		const cat_proj = document.querySelector("#add_project_task_popup").getAttribute("description").split("_");
		const task = document.querySelector("#add_project_task_name").value;
		document.querySelector("#add_project_task_name").value = "";
		const category = cat_proj[0];
		const project = cat_proj[1];
		const idx = cat_proj[2]
		

		app_data["categories"][unhyphenatedName(category)][idx]["tasks_todo"].push({"task": task, "spot": 0});
		refreshPage(app_data);
		saveData(app_data);
		closePopup();
	}

	document.querySelector("#close_popup_btn").addEventListener("click", closePopup);
	document.querySelector("#add_project_task_submit").addEventListener("click", submitProjectTask);

	document.querySelector("#add_category_submit").addEventListener("click", function () {
		const new_cat_name = document.querySelector("#add_category_name").value;
		if (!(new_cat_name in app_data["categories"]))
			app_data["categories"][new_cat_name] = {};
		document.querySelector("#add_category_name").value = "";
		refreshPage(app_data);
		saveData(app_data);
	});

	getData();
});
<script lang="ts">
	import { Project, ProjectContent, ProjectDetail } from '$lib/classes';
	import { globalState } from '$lib/runes/main.svelte';
	import { projectService } from '$lib/services/ProjectService';
	import toast from 'svelte-5-french-toast';

	let { close } = $props();

	let name: string = $state('');
	let reciter: string = $state('');

	async function createProjectButtonClick() {
		// Vérifie que le nom du projet n'est pas vide
		if (name.trim() === '') {
			toast.error('Project name cannot be empty.');
			return;
		}

		let project = new Project(
			new ProjectDetail(name, reciter),
			ProjectContent.getDefaultProjectContent()
		);

		// Sauvegarde le projet sur le disque
		await project.save();

		// maj des projets de l'utilisateur
		await projectService.loadUserProjectsDetails();

		// Ouvre le projet
		globalState.currentProject = project;
		close();
	}
</script>

<div
	class="bg-secondary border-color border rounded-4xl w-[600px] h-[340px] px-4 py-6 shadow-2xl shadow-black flex flex-col relative"
>
	<h2 class="text-center text-xl font-semibold mb-6">Create a new project</h2>

	<label for="name" class="mr-2">Name:</label>
	<input
		bind:value={name}
		name="name"
		type="text"
		maxlength="50"
		class="w-full mt-1"
		placeholder="Taraweeh 27th night"
	/>
	<p class="text-xs text-right mt-1 mr-0.5 text-secondary">{name.length}/50</p>

	<label for="name" class="mr-2 mt-4">Reciter:</label>
	<input
		bind:value={reciter}
		name="name"
		type="text"
		maxlength="35"
		class="w-full mt-1"
		placeholder="Yasser Al Dosari"
	/>
	<p class="text-xs text-right mt-1 mr-0.5 text-secondary">{reciter.length}/35</p>

	<button class="mt-3 mx-auto btn-accent px-6 py-2" onclick={createProjectButtonClick}
		>Create</button
	>

	<!-- Close button -->
	<button
		class="absolute top-3 right-3 text-secondary hover:text-primary cursor-pointer"
		onclick={close}
	>
		<!-- material icons -->
		<span class="material-icons">close</span>
	</button>
</div>

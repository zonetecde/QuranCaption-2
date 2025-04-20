<script lang="ts">
	import { telemetry } from '$lib/ext/Utilities';
	import type { ProjectDesc } from '$lib/models/Project';
	import { createBlankProject, updateUsersProjects } from '$lib/stores/ProjectStore';
	import toast from 'svelte-french-toast';
	import { blur } from 'svelte/transition';

	let projectName = 'New Project';
	let reciter = '';
	export let createProjectVisibility: boolean;
	export let openProject: (projectId: string) => void;
	export let userProjectsDesc: ProjectDesc[];

	/**
	 * Handle create project button clicked
	 * This function create a new project and save it to the local storage
	 */
	async function handleCreateProjectButtonClicked() {
		if (!projectName) {
			toast.error('Please enter a project title');
			return;
		}

		const project = createBlankProject(projectName, reciter);

		userProjectsDesc = await updateUsersProjects(project); // Save the project to the local storage

		await telemetry(
			'A Quran Caption project has been created | Name : ' + projectName + ' | Reciter : ' + reciter
		);

		openProject(project.id); // Open the project
	}
</script>

<div
	transition:blur
	class="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center"
>
	<div
		class="relative w-6/12 max-w-[500px] bg-default border-2 border-black rounded-xl p-4 flex flex-col items-center"
	>
		<button
			class="w-6 h-6 absolute top-2 right-2 cursor-pointer border rounded-full"
			on:click={() => (createProjectVisibility = false)}
		>
			<svg
				xmlns="http://www.w3.org/2000/svg"
				fill="none"
				viewBox="0 0 24 24"
				stroke-width="1.5"
				stroke="gray"
			>
				<path stroke-linecap="round" stroke-linejoin="round" d="M6 18 18 6M6 6l12 12" />
			</svg>
		</button>

		<p class="self-start">Project's title:</p>
		<input
			type="text"
			class="w-full h-10 border-2 border-black bg-[#272424] rounded-md p-2 mt-2 outline-none"
			bind:value={projectName}
			on:keydown={(e) => {
				if (e.key === 'Enter') handleCreateProjectButtonClicked();
			}}
		/>

		<p class="self-start mt-5">Reciter: <sm class="text-xs ml-auto opacity-50">(optional)</sm></p>
		<input
			type="text"
			class="w-full h-10 border-2 border-black bg-[#272424] rounded-md p-2 mt-2 outline-none"
			bind:value={reciter}
			on:keydown={(e) => {
				if (e.key === 'Enter') handleCreateProjectButtonClicked();
			}}
		/>

		<button
			class="w-1/2 h-10 bg-[#186435] hover:bg-[#163a23] duration-150 text-white mt-5 rounded-md"
			on:click={handleCreateProjectButtonClicked}
		>
			Create
		</button>
	</div>
</div>

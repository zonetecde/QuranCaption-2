<script lang="ts">
	import type Project from '$lib/Project';
	import { blur, fade } from 'svelte/transition';
	import { onMount } from 'svelte';
	import toast from 'svelte-french-toast';

	let createProjectVisibility = false;
	let projectName = 'New Project';

	let userProjects: Project[] = [];
	onMount(async () => {
		const projectsJson = localStorage.getItem('projects');
		userProjects = projectsJson ? JSON.parse(projectsJson) : [];
	});

	/**
	 * Handle create project button clicked
	 * This function create a new project and save it to the local storage
	 */
	function handleCreateProjectButtonClicked() {
		if (!projectName) {
			toast.error('Please enter a project name');
			return;
		}

		createProjectVisibility = true;

		let uniqueId = 0;
		while (userProjects.some((project) => project.id === uniqueId)) {
			uniqueId++;
		}

		userProjects.push({
			id: uniqueId,
			name: projectName,
			createdAt: new Date(),
			updatedAt: new Date(),
			description: ''
		});

		localStorage.setItem('projects', JSON.stringify(userProjects));

		openProject(uniqueId);
	}

	function openProject(id: number): any {
		window.location.href = `/editor/${id}`;
	}
</script>

<div class="p-5 h-screen flex items-center justify-center">
	<div class="xl:w-4/6 w-full">
		<h1 class="text-4xl text-center schibstedGrotesk">QuranCaption 2</h1>

		<div class="mt-10">
			<p class="text-xl">Recent project</p>

			<div class="mt-2 h-40 bg-black bg-opacity-30 rounded-xl p-3">
				{#each userProjects as project}
					<button
						class="w-56 h-full bg-[#1c2031] flex flex-col justify-between p-3 rounded-xl"
						on:click={() => openProject(project.id)}
					>
						<p>{project.name}</p>
						<p>{new Date(project.createdAt).toLocaleString()}</p>
					</button>
				{/each}
			</div>
		</div>

		<div class="mt-12 flex justify-center">
			<button
				on:click={() => (createProjectVisibility = true)}
				class="text-xl bg-[#186435] hover:bg-[#163a23] duration-150 px-12 py-3 rounded-3xl border-2 border-[#102217] shadow-xl shadow-black"
				>Create a new project</button
			>
		</div>
	</div>
</div>

{#if createProjectVisibility}
	<div
		transition:blur
		class="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center"
	>
		<div
			class="relative w-6/12 bg-default border-2 border-black rounded-xl p-4 flex flex-col items-center"
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

			<p class="self-start">Name of the project :</p>
			<input
				type="text"
				class="w-full h-10 border-2 border-black bg-[#272424] rounded-md p-2 mt-2 outline-none"
				bind:value={projectName}
			/>

			<button
				class="w-1/2 h-10 bg-[#186435] hover:bg-[#163a23] duration-150 text-white mt-4 rounded-md"
				on:click={handleCreateProjectButtonClicked}
			>
				Create
			</button>
		</div>
	</div>
{/if}

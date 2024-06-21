<script lang="ts">
	import { blur, fade } from 'svelte/transition';
	import { onMount } from 'svelte';
	import toast from 'svelte-french-toast';
	import {
		createBlankProject,
		delProject,
		getUserProjects,
		updateUsersProjects
	} from '$lib/stores/ProjectStore';
	import type Project from '$lib/models/Project';
	import {
		GITHUB_API_URL as GITHUB_API_URL,
		GITHUB_DOWNLOAD_LINK,
		GITHUB_REPO_LINK,
		SOFTWARE_VERSION
	} from '$lib/ext/GlobalVariables';
	import { newUpdateAvailable } from '$lib/stores/LayoutStore';
	import { open as openLink } from '@tauri-apps/api/shell';
	import { importAndReadFile } from '$lib/ext/Utilities';
	import Id from '$lib/ext/Id';

	let createProjectVisibility = false;
	let projectName = 'New Project';

	let userProjects: Project[] = [];

	onMount(async () => {
		userProjects = getUserProjects();

		// Check if a new version is available
		const response = await fetch(GITHUB_API_URL);
		if (response.ok) {
			const data = await response.json();
			if (data.tag_name !== SOFTWARE_VERSION) {
				newUpdateAvailable.set(true);
			}
		}
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

		const project = createBlankProject(projectName);

		updateUsersProjects(project); // Save the project to the local storage

		openProject(project); // Open the project
	}

	/**
	 * Open a project
	 */
	function openProject(project: Project) {
		window.location.href = `/editor?${project.id}`; // Redirect to the editor page
	}

	/**
	 * Handle delete project
	 */
	function handleDelProject(id: string) {
		userProjects = delProject(id);
	}

	/**
	 * Handle import project button clicked
	 */
	async function handleImportProjectButtonClicked() {
		const content = await importAndReadFile('QuranCaption 2 Project (*.qc2)');

		if (content) {
			const project = JSON.parse(content);

			project.id = Id.generate(); // Generate a new id for the project

			updateUsersProjects(project); // Save the project to the local storage

			openProject(project); // Open the project
		}
	}
</script>

<div class="p-5 h-screen flex items-center justify-center relative">
	<div class="xl:w-4/6 w-full">
		<h1 class="text-4xl text-center schibstedGrotesk">QuranCaption 2</h1>

		<div class="mt-10">
			<p class="text-xl pl-3">Recent project :</p>

			<div
				class="mt-2 h-40 bg-default border-4 border-[#141414] rounded-xl p-3 flex gap-4 flex-wrap overflow-y-auto"
			>
				{#each userProjects.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()) as project}
					<div class="w-56 h-full bg-[#2e2f36] rounded-xl relative group">
						<button class="flex flex-col p-3" on:click={() => openProject(project)}>
							<p>{project.name}</p>
							<p class="absolute bottom-1 text-sm">
								{new Date(project.createdAt).toLocaleString()}
							</p>
						</button>
						<button
							class="w-6 h-6 absolute top-1 right-1 bg-red-200 rounded-full p-1 hidden group-hover:block"
							on:click={(e) => handleDelProject(project.id)}
						>
							<svg
								xmlns="http://www.w3.org/2000/svg"
								fill="none"
								viewBox="0 0 24 24"
								stroke-width="1.5"
								stroke="red"
							>
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0"
								/>
							</svg>
						</button>
					</div>
				{/each}
			</div>
		</div>

		<div class="mt-12 flex justify-center">
			<div class="grid grid-cols-2 gap-x-3">
				<button
					on:click={() => (createProjectVisibility = true)}
					class="text-xl bg-[#186435] hover:bg-[#163a23] duration-150 px-12 py-3 rounded-3xl border-2 border-[#102217] shadow-xl shadow-black"
					>Create a new project</button
				>
				<button
					on:click={handleImportProjectButtonClicked}
					class="text-xl bg-[#186435] hover:bg-[#163a23] duration-150 px-12 py-3 rounded-3xl border-2 border-[#102217] shadow-xl shadow-black"
					>Import a project</button
				>
			</div>
		</div>
	</div>

	<p class="absolute bottom-3">
		Made by <button
			class="text-blue-300"
			on:click={() => {
				openLink('https://www.rayanestaszewski.fr');
			}}>Rayane STASZEWSKI</button
		>
		•
		<button
			class="text-blue-300"
			on:click={() => {
				openLink(GITHUB_REPO_LINK);
			}}>GitHub repo</button
		>
		•
		<button
			class="text-blue-300"
			on:click={() => {
				openLink('https://buymeacoffee.com/zonetecde');
			}}>Buy Me A Coffee</button
		>
		•
		{SOFTWARE_VERSION.replace('v', 'Version ')}
	</p>
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

{#if $newUpdateAvailable}
	<div transition:fade class="absolute inset-0 backdrop-blur-sm flex items-center justify-center">
		<div
			class="relative w-[400px] bg-default border-2 border-black rounded-xl p-4 flex flex-col items-center"
		>
			<button
				class="w-6 h-6 absolute top-2 right-2 cursor-pointer border rounded-full"
				on:click={() => newUpdateAvailable.set(false)}
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

			<p class="self-start text-center">A new version of QuranCaption 2 is available</p>

			<button
				class="w-1/2 h-10 bg-[#186435] hover:bg-[#163a23] duration-150 text-white mt-4 rounded-md"
				on:click={() => openLink(GITHUB_DOWNLOAD_LINK)}
			>
				Update
			</button>
		</div>
	</div>
{/if}

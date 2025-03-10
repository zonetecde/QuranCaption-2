<script lang="ts">
	import { blur, fade } from 'svelte/transition';
	import { onMount } from 'svelte';
	import toast from 'svelte-french-toast';
	import {
		backupAllProjects,
		createBlankProject,
		currentProject,
		delProject,
		getProjectById,
		getUserProjects,
		restoreAllProjects,
		updateUserProjectsDesc,
		updateUsersProjects
	} from '$lib/stores/ProjectStore';
	import type Project from '$lib/models/Project';
	import {
		GITHUB_API_URL as GITHUB_API_URL,
		GITHUB_DOWNLOAD_LINK,
		GITHUB_REPO_LINK,
		SOFTWARE_VERSION
	} from '$lib/ext/GlobalVariables';
	import { newUpdateAvailable, newUpdateDescription } from '$lib/stores/LayoutStore';
	import { open as openLink } from '@tauri-apps/api/shell';
	import { importAndReadFile, millisecondsToHHMMSS, telemetry } from '$lib/ext/Utilities';
	import Id from '$lib/ext/Id';
	import SvelteMarkdown from 'svelte-markdown';
	import { invoke } from '@tauri-apps/api/tauri';
	import { open } from '@tauri-apps/api/dialog';
	import { addAssets } from '$lib/models/Asset';
	import type { ProjectDesc } from '$lib/models/Project';
	import {
		addInformationsAboutProjectMigration,
		newProjectSystemMigration
	} from '$lib/ext/VersionFix';
	import { localStorageWrapper } from '$lib/ext/LocalStorageWrapper';
	import { secondsToHHMMSS } from '$lib/models/Timeline';
	import { confirm } from '@tauri-apps/api/dialog';

	let createProjectVisibility = false;
	let projectName = 'New Project';

	let userProjectsDesc: ProjectDesc[] = [];

	let searchText = '';
	let hasProjectLoaded = false;

	onMount(async () => {
		await newProjectSystemMigration();

		userProjectsDesc = await getUserProjects();

		if (await addInformationsAboutProjectMigration(userProjectsDesc))
			// Add informations about the projects (% captioned, duration, etc)
			userProjectsDesc = await getUserProjects(); // update the projects if the migration has been done

		hasProjectLoaded = true;

		// Check if a new version is available
		const response = await fetch(GITHUB_API_URL);
		if (response.ok) {
			const data = await response.json();

			if (data.tag_name !== SOFTWARE_VERSION) {
				newUpdateAvailable.set(true);
				newUpdateDescription.set(data.body);
			}
		}

		//@ts-ignore
		kofiWidgetOverlay.draw('vzero', {
			type: 'floating-chat',
			'floating-chat.donateButton.text': 'Support me',
			'floating-chat.donateButton.background-color': '#794bc4',
			'floating-chat.donateButton.text-color': '#fff'
		});
	});

	/**
	 * Handle create project button clicked
	 * This function create a new project and save it to the local storage
	 */
	async function handleCreateProjectButtonClicked() {
		if (!projectName) {
			toast.error('Please enter a project name');
			return;
		}

		const project = createBlankProject(projectName);

		userProjectsDesc = await updateUsersProjects(project); // Save the project to the local storage

		await telemetry('A project has been created : ' + projectName);

		openProject(project.id); // Open the project
	}

	/**
	 * Open a project
	 */
	function openProject(projectId: string) {
		window.location.href = `/editor?${projectId}`; // Redirect to the editor page
	}

	/**
	 * Handle delete project
	 */
	async function handleDelProject(id: string) {
		userProjectsDesc = await delProject(id);
	}

	/**
	 * Handle import project button clicked
	 */
	async function handleImportProjectButtonClicked() {
		const content = await importAndReadFile('Quran Caption Project (*.qc2)');

		if (content) {
			const project = JSON.parse(content);

			project.id = Id.generate(); // Generate a new id for the project

			userProjectsDesc = await updateUsersProjects(project); // Save the project to the local storage

			openProject(project.id); // Open the project
		}
	}

	/**
	 * Handle backup all projects button clicked
	 */
	export async function handleBackupAllProjectsButtonClicked() {
		await backupAllProjects(userProjectsDesc);
	}

	/**
	 * Handle restore all projects button clicked
	 */
	async function handleRestoreAllProjectsButtonClicked() {
		const content = await importAndReadFile('Quran Caption Backup (*.qcb)', ['qcb']);

		if (content) {
			userProjectsDesc = await restoreAllProjects(content);
		}
	}

	const LANGUAGE_TO_COUNTRY = {
		en: 'US', // English -> United States
		ar: 'SA', // Arabic -> Saudi Arabia
		zh: 'CN', // Chinese -> China
		pt: 'PT', // Portuguese -> Portugal
		ja: 'JP', // Japanese -> Japan
		ko: 'KR', // Korean -> South Korea
		de: 'DE', // German -> Germany
		it: 'IT', // Italian -> Italy
		nl: 'NL' // Dutch -> Netherlands
	};

	/**
	 * Convert language codes to flag emojies
	 *
	 * @param langCodes The language codes
	 * @returns The flag emojies
	 */
	function langCodeToFlagEmojies(langCodes: string[]) {
		const flags = langCodes.map((langCode) => {
			const language = langCode.substring(0, 2).toLowerCase();
			//@ts-ignore
			const countryCode = LANGUAGE_TO_COUNTRY[language] || language.toUpperCase();

			return `<img src="http://purecatamphetamine.github.io/country-flag-icons/3x2/${countryCode}.svg" alt="${countryCode}" width="20" style="display: inline-block; vertical-align: middle; margin-left: 3px;">`;
		});
		return `(${flags.join(', ')})`;
	}

	$: if (hasProjectLoaded) {
		updateUserProjectsDesc(userProjectsDesc);
	}
</script>

<div class="p-5 h-screen flex items-center justify-center relative">
	<div class="xl:w-4/6 w-full">
		<h1 class="text-4xl font-bold text-center schibstedGrotesk">Quran Caption</h1>

		<div class="mt-10 relative h-80 2xl:h-[500px] xl:h-[400px]">
			<p class="text-xl pl-3">Project{userProjectsDesc.length > 1 ? 's' : ''} :</p>

			<input
				type="text"
				placeholder="Search..."
				bind:value={searchText}
				class="w-80 right-0 top-1 absolute h-8 border-4 border-b-0 border-[#141414] bg-[#171717] rounded-t-md p-2 outline-none"
			/>

			<div
				class={'mt-2 h-full bg-default border-4 border-[#141414] rounded-xl p-3 flex gap-4 flex-wrap overflow-y-auto ' +
					(userProjectsDesc.length >= 4 ? 'justify-evenly h-80' : '')}
			>
				{#each userProjectsDesc.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()) as project}
					{#if searchText === '' || project.name.toLowerCase().includes(searchText.toLowerCase())}
						<div class="w-full h-32 bg-[#403e46] rounded-xl relative group p-3">
							<div class="grid grid-cols-2 grid-rows-2">
								<p>
									Name:
									<button
										on:click={() => {
											const newProjectName = prompt(
												'Enter the new name of the project',
												project.name
											);
											if (newProjectName) project.name = newProjectName;
										}}><b>{project.name}</b></button
									>
								</p>

								<!-- prevent this from showing if the migration hasnt been done yet -->
								{#if project.translations !== undefined}
									<p>
										Percentage captioned: <b>{project.percentageCaptioned}%</b>
									</p>

									<p>Duration: <b>{secondsToHHMMSS(project.duration, true)[0]}</b></p>

									{#if project.percentageTranslated !== -1}
										<p>
											Percentage translated: <b>{project.percentageTranslated}%</b>
											{@html langCodeToFlagEmojies(project.translations)}
										</p>
									{:else}
										<!-- dummy div pour occuper une place de la grid -->
										<div></div>
									{/if}

									<p>
										Reciter: <button
											on:click={() => {
												// open window text prompt
												const newReciter = prompt(
													'Enter the new reciter of the project',
													project.reciter
												);
												if (newReciter) project.reciter = newReciter;
											}}><b>{project.reciter || 'Ø'}</b></button
										>
									</p>

									<div
										class="absolute top-0 right-0 rounded-tr-xl rounded-bl-xl px-3 py-1 group/status"
									>
										<button on:click={() => {}}>Status: {project.status}</button>

										<div
											class="absolute group-hover/status:block hidden top-8 right-2 bg-[#a1a1ba] text-black w-48 h-[5rem] border-2 z-10 rounded-md flex-col"
										>
											<p class="font-bold text-center">Select a new status</p>
											<select
												bind:value={project.status}
												class=" ml-6 mt-0.5 h-10 w-3/4 bg-[#474c55] rounded-md p-2 text-white"
											>
												<option value="To caption">To caption</option>
												<option value="Captioning">Captioning</option>
												<option value="To translate">To translate</option>
												<option value="Translating">Translating</option>
												<option value="To export">To export</option>
												<option value="Exported">Exported</option>
												<option value="not set">Not set</option>
											</select>
										</div>
									</div>
								{/if}
							</div>
							<p class="absolute bottom-1 right-2 text-sm">
								Last update : {new Date(project.updatedAt).toLocaleString([], {
									month: 'long',
									day: '2-digit',
									year: 'numeric',
									hour: '2-digit',
									minute: '2-digit'
								})}
							</p>

							<button
								class="px-5 py-2 bg-[#3a533a] absolute bottom-0 left-0 rounded-bl-xl rounded-tr-xl hover:bg-[#2f4a2f] duration-150"
								on:click={() => openProject(project.id)}>Open</button
							>

							<!-- Delete project button -->
							<button
								class="w-6 h-6 absolute bottom-1.5 left-[5.5rem] bg-red-200 rounded-full p-1 hidden group-hover:block"
								on:click={async (e) => {
									// tauri prompt to confirm deletion
									const res = await confirm('Are you sure you want to delete this project?');
									if (res) handleDelProject(project.id);
								}}
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
					{/if}
				{/each}
			</div>
		</div>

		<div class="mt-14 -mb-10 flex justify-center">
			<div class="grid grid-cols-2 gap-x-3 gap-y-4">
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

				<button
					on:click={handleBackupAllProjectsButtonClicked}
					class="text-lg opacity-50 bg-black hover:bg-[#53554e] duration-150 scale-75 py-1 rounded-3xl border-2 border-[#353534]"
					>Backup all projects</button
				>

				<button
					on:click={handleRestoreAllProjectsButtonClicked}
					class="text-lg opacity-50 bg-black hover:bg-[#53554e] duration-150 scale-75 py-1 rounded-3xl border-2 border-[#353534]"
					>Restore all projects</button
				>
			</div>
		</div>
	</div>

	<p class="absolute bottom-3 max-w-[600px] xl:max-w-full text-center">
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
			}}>GitHub Repo</button
		>
		•
		<button
			class="text-blue-300"
			on:click={() => {
				openLink('https://qurancaption-project.vercel.app/documentation');
			}}>Documentation</button
		>
		•
		<button
			class="text-blue-300"
			on:click={() => {
				openLink('https://ko-fi.com/vzero');
			}}>Make a donation</button
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

			<p class="self-start">Name of the project :</p>
			<input
				type="text"
				class="w-full h-10 border-2 border-black bg-[#272424] rounded-md p-2 mt-2 outline-none"
				bind:value={projectName}
				on:keydown={(e) => {
					if (e.key === 'Enter') handleCreateProjectButtonClicked();
				}}
			/>

			<button
				class="w-1/2 h-10 bg-[#186435] hover:bg-[#163a23] duration-150 text-white mt-10 rounded-md"
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
			class="relative w-[600px] bg-default border-2 border-black rounded-xl p-4 flex flex-col items-center"
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

			<p class="self-start text-center w-full">A new version of Quran Caption is available</p>

			<div class="mt-5 max-h-80 overflow-y-auto bg-black p-2 -mx-2">
				<SvelteMarkdown source={$newUpdateDescription} />
			</div>
			<button
				class="w-1/2 h-10 bg-[#186435] hover:bg-[#163a23] duration-150 text-white mt-4 rounded-md"
				on:click={() => openLink(GITHUB_DOWNLOAD_LINK)}
			>
				Update
			</button>
		</div>
	</div>
{/if}

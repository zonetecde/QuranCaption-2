<script lang="ts">
	import CreateProjectForm from '$lib/components/home/CreateProjectForm.svelte';
	import NewUpdatePopUp from '$lib/components/home/NewUpdatePopUp.svelte';
	import ProjectTile from '$lib/components/home/ProjectTile.svelte';
	import SortMenu from '$lib/components/home/SortMenu.svelte';
	import { GITHUB_REPO_LINK, SOFTWARE_VERSION } from '$lib/ext/GlobalVariables';
	import Id from '$lib/ext/Id';
	import {
		addInformationsAboutProjectMigration,
		newProjectSystemMigration
	} from '$lib/ext/VersionFix';
	import { importAndReadFile } from '$lib/functions/FileDialogHelper';
	import { type ProjectDesc } from '$lib/models/Project';
	import { onlyShowThosesWithStatus, sortDirection, sortType } from '$lib/stores/LayoutStore';
	import {
		backupAllProjects,
		getUserProjects,
		restoreAllProjects,
		updateUsersProjects
	} from '$lib/stores/ProjectStore';
	import { open as openLink } from '@tauri-apps/api/shell';
	import { onMount } from 'svelte';

	let createProjectVisibility = false;
	let userProjectsDesc: ProjectDesc[] = [];
	let sortedProjects: ProjectDesc[] = [];

	$: if (userProjectsDesc || $sortType || $sortDirection || $onlyShowThosesWithStatus) {
		sortedProjects = getSortedUserProjects();
	}

	let searchText = '';
	let showSortMenu = false;

	onMount(async () => {
		await newProjectSystemMigration();

		userProjectsDesc = await getUserProjects();

		if (await addInformationsAboutProjectMigration(userProjectsDesc))
			// Add informations about the projects (% captioned, duration, etc)
			userProjectsDesc = await getUserProjects(); // update the projects if the migration has been done

		//@ts-ignore
		kofiWidgetOverlay.draw('vzero', {
			type: 'floating-chat',
			'floating-chat.donateButton.text': 'Support me',
			'floating-chat.donateButton.background-color': '#794bc4',
			'floating-chat.donateButton.text-color': '#fff'
		});
	});

	/**
	 * Open a project
	 */
	function openProject(projectId: string) {
		window.location.href = `/editor?${projectId}`; // Redirect to the editor page
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

			await addInformationsAboutProjectMigration(userProjectsDesc, true);
			userProjectsDesc = await getUserProjects(); // update the projects when the migration is done
		}
	}

	/**
	 * Check if the project match the search text
	 */
	function checkSearchText(project: ProjectDesc, searchText: string): boolean {
		return (
			// Check if the project match the search text
			project.name.toLowerCase().includes(searchText.toLowerCase()) ||
			// Check if the project reciter match the search text
			project.reciter.toLowerCase().includes(searchText.toLowerCase()) ||
			// Check if the project verses range match the search text (surahs)
			project.versesRange
				.join(', ')
				.replaceAll("'", '')
				.replaceAll('-', '')
				.toLowerCase()
				.includes(searchText.replaceAll("'", '').replaceAll('-', '').toLowerCase())
		);
	}

	function getSortedUserProjects(): ProjectDesc[] {
		if (userProjectsDesc.length === 0) return [];
		try {
			return userProjectsDesc
				.filter((project) => {
					return $onlyShowThosesWithStatus.includes(project.status);
				})
				.sort((a, b) => {
					switch ($sortDirection) {
						case 'asc':
							switch ($sortType) {
								case 'updatedAt':
									return new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime();
								case 'createdAt':
									return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
								case 'name':
									return a.name.localeCompare(b.name);
								case 'duration':
									return a.duration - b.duration;
								case 'reciter':
									return a.reciter.localeCompare(b.reciter);
								default:
									return 0;
							}
						case 'desc':
							switch ($sortType) {
								case 'updatedAt':
									return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
								case 'createdAt':
									return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
								case 'name':
									return b.name.localeCompare(a.name);
								case 'duration':
									return b.duration - a.duration;
								case 'reciter':
									return b.reciter.localeCompare(a.reciter);
								default:
									return 0;
							}
						default:
							return 0;
					}
				});
		} catch (e) {
			console.error(e);
			return userProjectsDesc;
		}
	}
</script>

<div class="p-5 h-screen flex items-center justify-center relative">
	<div class="xl:w-4/6 w-full">
		<h1 class="text-4xl font-bold text-center schibstedGrotesk">Quran Caption</h1>

		<div class="mt-10 relative h-80 2xl:h-[500px] xl:h-[400px]">
			<p class="text-xl pl-3">Project{userProjectsDesc.length > 1 ? 's' : ''} :</p>

			<abbr title="Sort">
				<button
					class="w-8 right-[20rem] top-1 absolute border-[#141414] bg-[#171717] border-4 rounded-tl-md"
					on:click={() => {
						showSortMenu = !showSortMenu;
					}}
				>
					<svg
						xmlns="http://www.w3.org/2000/svg"
						viewBox="0 0 24 24"
						style="fill: white;transform: rotate(180deg);msFilter:progid:DXImageTransform.Microsoft.BasicImage(rotation=2);"
						><path d="M7 20h2V8h3L8 4 4 8h3zm13-4h-3V4h-2v12h-3l4 4z"></path></svg
					>
				</button>
			</abbr>

			{#if showSortMenu}
				<SortMenu />
			{/if}

			<input
				type="text"
				placeholder="Search..."
				bind:value={searchText}
				class="w-80 right-0 top-1 absolute h-8 border-4 border-b-0 border-l-0 border-[#141414] bg-[#171717] rounded-tr-md p-2 outline-none"
			/>

			<div
				class={'mt-2 h-full bg-default border-4 border-[#141414] rounded-xl p-3 flex gap-4 flex-wrap flex-row overflow-y-auto '}
			>
				{#if userProjectsDesc.length > 0}
					{#each sortedProjects as project}
						{#if searchText === '' || checkSearchText(project, searchText)}
							<ProjectTile {project} bind:userProjectsDesc {openProject} />
						{/if}
					{/each}
				{:else}
					<div class="w-full h-full flex items-center justify-center">
						<p class="text-center text-xl bg-black bg-opacity-30 py-5 px-16 rounded-xl">
							You have no project yet<br /><br /> Click on "Create a new project" to start !
						</p>
					</div>
				{/if}
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
	<CreateProjectForm bind:createProjectVisibility {openProject} bind:userProjectsDesc />
{/if}

<NewUpdatePopUp />

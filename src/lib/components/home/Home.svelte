<script lang="ts">
	import { fade } from 'svelte/transition';
	import InputWithIcon from '../misc/InputWithIcon.svelte';
	import Footer from './Footer.svelte';
	import Header from './Header.svelte';
	import CreateProjectModal from './modals/CreateProjectModal.svelte';
	import ProjectDetailCard from './ProjectDetailCard.svelte';
	import { globalState } from '$lib/runes/main.svelte';
	import { onMount } from 'svelte';
	import { getCurrentWindow } from '@tauri-apps/api/window';
	import TitleBar from '../projectEditor/TitleBar.svelte';

	let createNewProjectModalVisible: boolean = $state(false);

	/**
	 * Affiche le popup pour créer un nouveau projet.
	 */
	function newProjectButtonClick() {
		createNewProjectModalVisible = true;
	}
</script>

<div class="flex flex-col min-h-screen overflow-x-hidden overflow-auto">
	<div class="flex-grow px-6 md:px-12 pt-6 pb-4 md:pt-22 md:pb-14">
		<div placeholder="Upper section" class="flex flex-row items-center">
			<section>
				<h2 class="text-4xl font-bold">Welcome Back!</h2>
				<h4 class="text-secondary">Let's create something amazing today.</h4>
			</section>
			<section class="ml-auto flex gap-x-4">
				<button class="btn-accent btn-icon h-12 px-4 xl:px-7" onclick={newProjectButtonClick}>
					<span class="material-icons-outlined mr-2">add_circle_outline</span> New Project
				</button>
				<button class="btn btn-icon h-12 px-4 xl:px-7">
					<span class="material-icons-outlined mr-2">file_upload</span> Import Project
				</button>
			</section>
		</div>

		<div placeholder="Recent projects" class="mt-8 flex justify-between items-center">
			<h3 class="text-2xl font-semibold text-white">Recent Projects</h3>

			<div class="flex items-center space-x-4">
				<InputWithIcon icon="search" placeholder="Search projects..." classes="w-64" />

				<button class="btn text-sm p-2 btn-icon">
					<span class="material-icons-outlined">filter_list</span>
				</button>
				<button class="btn text-sm p-2 btn-icon">
					<span class="material-icons-outlined">view_module</span>
				</button>
			</div>
		</div>

		{#if globalState.userProjectsDetails.length === 0}
			<p class="mt-4">You don't have any projects yet. Click "New Project" to create one.</p>
		{:else}
			<div
				placeholder="Project cards"
				class="mt-4 grid grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-6"
			>
				{#each globalState.userProjectsDetails as _, index}
					<ProjectDetailCard bind:projectDetail={globalState.userProjectsDetails[index]} />
				{/each}
			</div>
		{/if}
	</div>

	<Footer />
</div>

{#if createNewProjectModalVisible}
	<div class="modal-wrapper" transition:fade>
		<CreateProjectModal close={() => (createNewProjectModalVisible = false)} />
	</div>
{/if}

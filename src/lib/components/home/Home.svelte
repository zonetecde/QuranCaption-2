<script lang="ts">
	import { fade } from 'svelte/transition';
	import InputWithIcon from '../misc/InputWithIcon.svelte';
	import Footer from './Footer.svelte';
	import Header from './Header.svelte';
	import CreateProjectModal from './modals/CreateProjectModal.svelte';

	let createNewProjectModalVisible: boolean = $state(false);

	/**
	 * Affiche le popup pour créer un nouveau projet.
	 */
	function newProjectButtonClick() {
		createNewProjectModalVisible = true;
	}
</script>

<div class="flex flex-col min-h-screen">
	<Header />

	<div class="flex-grow p-12">
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

		<div
			placeholder="Project cards"
			class="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6"
		>
			<!-- each loop here -->
		</div>
	</div>

	<Footer />
</div>

{#if createNewProjectModalVisible}
	<div class="modal-wrapper" transition:fade>
		<CreateProjectModal close={() => (createNewProjectModalVisible = false)} />
	</div>
{/if}

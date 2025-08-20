<script lang="ts">
	import { fade } from 'svelte/transition';
	import InputWithIcon from '../misc/InputWithIcon.svelte';
	import Footer from './Footer.svelte';
	import Header from './Header.svelte';
	import CreateProjectModal from './modals/CreateProjectModal.svelte';
	import ProjectDetailCard from './ProjectDetailCard.svelte';
	import FilterMenu from './FilterMenu.svelte';
	import SortMenu from './SortMenu.svelte';
	import { globalState } from '$lib/runes/main.svelte';
	import { onMount } from 'svelte';
	import { projectService } from '$lib/services/ProjectService';
	import { Status } from '$lib/classes/Status';
	import type { ProjectDetail } from '$lib/classes/ProjectDetail.svelte';

	let createNewProjectModalVisible: boolean = $state(false);

	// États pour les menus de filtrage et tri
	let filterMenuVisible = $state(false);
	let sortMenuVisible = $state(false);
	let selectedStatuses: Status[] = $state(Status.getAllStatuses());
	let filteredProjects: typeof globalState.userProjectsDetails = $state([]);

	let searchQuery: string = $state('');

	/**
	 * Affiche le popup pour créer un nouveau projet.
	 */
	function newProjectButtonClick() {
		createNewProjectModalVisible = true;
	}

	/**
	 * Bascule l'affichage du menu de filtrage
	 */
	function toggleFilterMenu() {
		filterMenuVisible = !filterMenuVisible;
		sortMenuVisible = false; // Ferme l'autre menu
	}

	/**
	 * Bascule l'affichage du menu de tri
	 */
	function toggleSortMenu() {
		sortMenuVisible = !sortMenuVisible;
		filterMenuVisible = false; // Ferme l'autre menu
	}

	/**
	 * Applique le filtre sur les projets
	 */
	function handleFilter(statuses: Status[]) {
		selectedStatuses = statuses;
		applyFilterAndSort();
	}

	/**
	 * Applique le tri sur les projets
	 */
	function handleSort(property: keyof ProjectDetail, ascending: boolean) {
		filteredProjects.sort((a, b) => {
			let valueA = a[property];
			let valueB = b[property];

			// Gestion spéciale pour les dates et durées
			if (valueA instanceof Date && valueB instanceof Date) {
				valueA = valueA.getTime();
				valueB = valueB.getTime();
			} else if (typeof valueA === 'object' && valueA && 'ms' in valueA) {
				// Pour Duration
				valueA = (valueA as any).ms;
				valueB = (valueB as any).ms;
			} else if (typeof valueA === 'string' && typeof valueB === 'string') {
				valueA = valueA.toLowerCase();
				valueB = valueB.toLowerCase();
			}

			if (valueA < valueB) return ascending ? -1 : 1;
			if (valueA > valueB) return ascending ? 1 : -1;
			return 0;
		});
		filteredProjects = [...filteredProjects]; // Trigger reactivity
	}

	/**
	 * Applique le filtre et maintient le tri actuel
	 */
	function applyFilterAndSort() {
		if (selectedStatuses.length === 0) {
			filteredProjects = [];
		} else {
			filteredProjects = globalState.userProjectsDetails.filter((project) =>
				selectedStatuses.some((status) => status.status === project.status.status)
			);
		}
	}

	onMount(async () => {
		if (globalState.userProjectsDetails.length === 0) {
			// Récupère les projets de l'utilisateur au chargement de l'application
			await projectService.loadUserProjectsDetails();
		} else {
			// Retrie juste dans l'ordre de updatetime
			globalState.userProjectsDetails = globalState.userProjectsDetails.sort(
				(a, b) => b.updatedAt.getTime() - a.updatedAt.getTime()
			);

			// Re-récupère les détails du projet le plus récent
			// Nécessaire car quand on les modifies dans le projet ça le modifie pas dans `globalState.userProjectsDetails`
			globalState.userProjectsDetails[0] = await projectService.loadDetail(
				globalState.userProjectsDetails[0].id
			);
		}

		// Initialise les projets filtrés
		applyFilterAndSort();
	});

	$effect(() => {
		// Reapplique le filtre quand la liste des projets change
		if (globalState.userProjectsDetails.length >= 0) {
			applyFilterAndSort();
		}
	});
</script>

<div class="flex flex-col min-h-full overflow-x-hidden overflow-auto">
	<div class="flex-grow px-6 md:px-12 mt-8 xl:mt-14 mb-8">
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
				<InputWithIcon
					icon="search"
					placeholder="Search projects..."
					classes="w-64"
					bind:value={searchQuery}
				/>

				<div class="relative">
					<button class="filter-button btn text-sm p-2 btn-icon" onclick={toggleFilterMenu}>
						<span class="material-icons-outlined">filter_list</span>
					</button>
					<FilterMenu
						bind:isVisible={filterMenuVisible}
						bind:selectedStatuses
						onFilter={handleFilter}
					/>
				</div>

				<div class="relative">
					<button class="sort-button btn text-sm p-2 btn-icon" onclick={toggleSortMenu}>
						<span class="material-icons-outlined">import_export</span>
					</button>
					<SortMenu bind:isVisible={sortMenuVisible} onSort={handleSort} />
				</div>
			</div>
		</div>

		{#if filteredProjects.length === 0}
			{#if selectedStatuses.length === 0}
				<p class="mt-4">
					No projects match the current filter. Adjust your status filter to see projects.
				</p>
			{:else if globalState.userProjectsDetails.length === 0}
				<p class="mt-4">You don't have any projects yet. Click "New Project" to create one.</p>
			{:else}
				<p class="mt-4">No projects match the current filter. Try adjusting your status filter.</p>
			{/if}
		{:else}
			<div
				placeholder="Project cards"
				class="mt-4 grid grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-6"
			>
				{#each filteredProjects as project, index}
					{#if searchQuery === '' || project.matchSearchQuery(searchQuery)}
						<ProjectDetailCard bind:projectDetail={filteredProjects[index]} />
					{/if}
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

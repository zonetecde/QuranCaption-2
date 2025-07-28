<script lang="ts">
	import { Project, ProjectContent, ProjectDetail } from '$lib/classes';
	import { globalState } from '$lib/runes/main.svelte';
	import { projectService } from '$lib/services/ProjectService';
	import { onMount } from 'svelte';
	import toast from 'svelte-5-french-toast';

	let { close } = $props();

	onMount(() => {
		// Récupère toutes les traductions disponibles
		globalState.currentProject!.content.projectTranslation.loadAvailableTranslations();
	});

	async function addTranslationButtonClick() {}
</script>

<div
	class="bg-secondary border-color border rounded-4xl w-[600px] h-[340px] px-4 py-6 shadow-2xl shadow-black flex flex-col relative"
>
	<h2 class="text-center text-xl font-semibold mb-6">Add a translation</h2>

	<button class="mt-3 mx-auto btn-accent px-6 py-2" onclick={addTranslationButtonClick}>Add</button>

	<!-- Close button -->
	<button
		class="absolute top-3 right-3 text-secondary hover:text-primary cursor-pointer"
		onclick={close}
	>
		<!-- material icons -->
		<span class="material-icons">close</span>
	</button>
</div>

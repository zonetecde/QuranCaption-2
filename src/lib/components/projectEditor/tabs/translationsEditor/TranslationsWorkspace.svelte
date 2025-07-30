<script lang="ts">
	import { globalState } from '$lib/runes/main.svelte';
	import { fade } from 'svelte/transition';

	function addTranslationButtonClick() {
		// Affiche le pop-up pour ajouter une nouvelle traduction
		setAddTranslationModalVisibility(true);
	}

	let {
		setAddTranslationModalVisibility
	}: {
		setAddTranslationModalVisibility: (visible: boolean) => void;
	} = $props();
</script>

<section class="min-h-0 bg-primary border border-color rounded-lg shadow-lg h-full">
	{#if globalState.currentProject!.content.projectTranslation.addedTranslationEditions.length === 0}
		<div class="flex items-center flex-col gap-y-3 justify-center h-full pb-10">
			<p class="text-thirdly">No translations added yet.</p>
			<button class="btn-accent px-4 py-1" onclick={addTranslationButtonClick}
				>Add Translation</button
			>
		</div>
	{/if}
</section>

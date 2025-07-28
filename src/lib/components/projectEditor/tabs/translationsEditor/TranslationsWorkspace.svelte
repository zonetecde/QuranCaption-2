<script lang="ts">
	import { globalState } from '$lib/runes/main.svelte';
	import { fade } from 'svelte/transition';
	import AddTranslationModal from './modal/AddTranslationModal.svelte';

	let addTranslationPopupVisible = $state(true);

	function addTranslationButtonClick() {
		// Affiche le pop-up pour ajouter une nouvelle traduction
		addTranslationPopupVisible = true;
	}
</script>

<div class="w-full h-full">
	{#if globalState.currentProject!.content.projectTranslation.addedTranslations.length === 0}
		<div class="flex items-center flex-col gap-y-3 justify-center h-full pb-10">
			<p class="text-thirdly">No translations added yet.</p>
			<button class="btn-accent px-4 py-1" onclick={addTranslationButtonClick}
				>Add Translation</button
			>
		</div>
	{:else}{/if}
</div>

{#if addTranslationPopupVisible}
	<div class="modal-wrapper" transition:fade>
		<AddTranslationModal close={() => (addTranslationPopupVisible = false)} />
	</div>
{/if}

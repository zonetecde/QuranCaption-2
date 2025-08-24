<script lang="ts">
	import type { Edition } from '$lib/classes';
	import Section from '$lib/components/projectEditor/Section.svelte';
	import { globalState } from '$lib/runes/main.svelte';
	import AskIaModal from '../modal/AskIAModal.svelte';

	let { edition } = $props();

	let showAskIAModal = $state(false);
	let aiModalTranslationEdition: Edition | null = $state(null);
</script>

<div
	class="bg-accent border border-color rounded-lg p-2 hover:border-accent-primary transition-all duration-200"
>
	<Section
		name={edition.author}
		icon={globalState.availableTranslations[edition.language].flag}
		classes="flex items-center"
	>
		<!-- Toggle pour afficher dans l'éditeur -->
		<div class="bg-secondary rounded-lg px-3 py-2 border border-color">
			<label
				class="text-sm font-medium text-secondary cursor-pointer flex items-center gap-3"
				for="showInTranslationsEditor"
			>
				<div class="relative">
					<input
						type="checkbox"
						bind:checked={edition.showInTranslationsEditor}
						class="w-5 h-5 rounded"
					/>
				</div>

				<div class="flex-1">
					<span
						class="block font-medium"
						onmousedown={(event) => {
							event.preventDefault();
							edition.showInTranslationsEditor = !edition.showInTranslationsEditor;
						}}
					>
						Show in editor
					</span>
				</div>
			</label>
		</div>

		<!-- Boutons d'action -->
		<div class="grid grid-cols-2 gap-x-2 mt-1.5">
			<button
				class="btn btn-icon px-4 py-2 text-sm font-medium flex-1 flex-row justify-center"
				onclick={() =>
					globalState.currentProject!.content.projectTranslation.removeTranslation(edition)}
			>
				<span class="material-icons text-base mr-1">delete</span>
				Remove
			</button>

			<button
				class="btn btn-icon px-4 py-2 text-sm flex-1 flex flex-row justify-center"
				onclick={() =>
					globalState.currentProject!.content.projectTranslation.resetTranslation(edition)}
			>
				<span class="material-icons text-base mr-1">refresh</span>
				Reset
			</button>
		</div>

		<!-- IA -->
		<button
			class="btn btn-icon w-full px-4 py-2 text-sm flex-1 flex flex-row justify-center mt-1.5"
			onclick={() => {
				showAskIAModal = true;
				aiModalTranslationEdition = edition;
			}}
		>
			<span class="material-icons text-base mr-2">auto_awesome</span>
			Ask AI
		</button>

		{#if globalState.currentProject!.detail.translations[edition.author]}
			<div class="flex justify-between text-xs text-[var(--text-secondary)] mb-1 mt-3">
				<span>Percentage reviewed:</span>
				<span class="font-medium text-[var(--text-primary)]"
					>{globalState.currentProject!.detail.translations[edition.author]}%</span
				>
			</div>
			<div class="bg-[var(--border-color)] rounded h-2 overflow-hidden">
				<div
					class="bg-[var(--accent-primary)] h-full rounded transition-all duration-300 ease-in-out"
					style="width: {globalState.currentProject!.detail.translations[edition.author]}%;"
				></div>
			</div>
		{/if}
	</Section>
</div>

{#if showAskIAModal && aiModalTranslationEdition}
	<div class="modal-wrapper">
		<AskIaModal close={() => (showAskIAModal = false)} edition={aiModalTranslationEdition} />
	</div>
{/if}

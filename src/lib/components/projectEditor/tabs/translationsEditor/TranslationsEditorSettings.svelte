<script lang="ts">
	import type { Edition } from '$lib/classes';
	import { globalState } from '$lib/runes/main.svelte';
	import Section from '../../Section.svelte';
	import AskIaModal from './modal/AskIAModal.svelte';

	let {
		setAddTranslationModalVisibility
	}: {
		setAddTranslationModalVisibility: (visible: boolean) => void;
	} = $props();

	let showAskIAModal = $state(false);
	let aiModalTranslationEdition: Edition | null = $state(null);
</script>

<div
	class="bg-secondary h-full border border-color rounded-lg py-6 px-2 space-y-6 border-r-0 relative overflow-hidden"
>
	<div class="relative z-10">
		<!-- En-tête avec icône -->
		<div class="flex gap-x-2 items-center justify-center mb-6">
			<span class="material-icons text-accent text-xl">translate</span>
			<h2 class="text-xl font-bold text-primary">Translations Editor</h2>
		</div>

		<!-- Liste des traductions -->
		<div class="space-y-4">
			{#each globalState.currentProject!.content.projectTranslation.addedTranslationEditions as edition}
				{#if globalState.availableTranslations && globalState.availableTranslations[edition.language]}
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
										globalState.currentProject!.content.projectTranslation.removeTranslation(
											edition
										)}
								>
									<span class="material-icons text-base mr-1">delete</span>
									Remove
								</button>

								<button
									class="btn btn-icon px-4 py-2 text-sm flex-1 flex flex-row justify-center"
									onclick={() =>
										globalState.currentProject!.content.projectTranslation.resetTranslation(
											edition
										)}
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
						</Section>
					</div>
				{/if}
			{/each}
		</div>

		<!-- Bouton d'ajout de nouvelle traduction -->
		<div class="pt-4 border-t border-color mt-6">
			<button
				class="btn-accent w-full px-6 py-3 text-sm font-semibold rounded-lg flex items-center justify-center gap-2 hover:shadow-lg transition-all duration-200"
				onclick={() => setAddTranslationModalVisibility(true)}
			>
				<span class="material-icons text-base">add</span>
				Add New Translation
			</button>
		</div>
	</div>
</div>

{#if showAskIAModal && aiModalTranslationEdition}
	<div class="modal-wrapper">
		<AskIaModal close={() => (showAskIAModal = false)} edition={aiModalTranslationEdition} />
	</div>
{/if}

<script lang="ts">
	import { SubtitleClip } from '$lib/classes';
	import { globalState } from '$lib/runes/main.svelte';
	import { fade } from 'svelte/transition';
	import TranslationEdition from './TranslationEdition.svelte';

	function addTranslationButtonClick() {
		// Affiche le pop-up pour ajouter une nouvelle traduction
		setAddTranslationModalVisibility(true);
	}

	let {
		setAddTranslationModalVisibility
	}: {
		setAddTranslationModalVisibility: (visible: boolean) => void;
	} = $props();

	let editionsToEdit = $derived(() =>
		globalState.currentProject!.content.projectTranslation.addedTranslationEditions.filter(
			(edition) => edition.showInTranslationsEditor
		)
	);
</script>

<section class="min-h-0 bg-primary border border-color rounded-lg shadow-lg h-full">
	{#if globalState.currentProject!.content.projectTranslation.addedTranslationEditions.length === 0}
		<div class="flex items-center flex-col gap-y-3 justify-center h-full pb-10">
			<p class="text-thirdly">No translations added yet.</p>
			<button class="btn-accent px-4 py-1" onclick={addTranslationButtonClick}
				>Add Translation</button
			>
		</div>
	{:else}
		<div class="flex p-4 flex-col bg-secondary gap-y-3">
			{#each globalState.getSubtitleTrack.clips as subtitle, i}
				<!-- Affiche le texte arabe -->
				{#if subtitle.type === 'Subtitle' || subtitle.type === 'Pre-defined Subtitle'}
					{@const _subtitle = subtitle as SubtitleClip}
					<section class="border border-color rounded px-4 py-4 text-primary">
						<p class="text-3xl arabic text-right" dir="rtl">{_subtitle.text}</p>
						{#if _subtitle.wbwTranslation}
							<p class="text-sm text-thirdly text-left" dir="rtl">
								{_subtitle.wbwTranslation}
							</p>
						{/if}

						{#each editionsToEdit() as edition, j}
							<TranslationEdition
								{edition}
								bind:subtitle={globalState.getSubtitleTrack.clips[i] as SubtitleClip}
							/>
						{/each}
					</section>
				{/if}
			{/each}
		</div>
	{/if}
</section>

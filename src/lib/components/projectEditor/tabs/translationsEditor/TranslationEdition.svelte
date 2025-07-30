<script lang="ts">
	import type { Edition, SubtitleClip, Translation } from '$lib/classes';
	import { VerseTranslation } from '$lib/classes/Translation.svelte';
	import { globalState } from '$lib/runes/main.svelte';

	let {
		edition,
		subtitle = $bindable<SubtitleClip>()
	}: {
		edition: Edition;
		subtitle: SubtitleClip;
	} = $props();

	let translation = $derived(() => {
		return subtitle.getTranslation(edition) as VerseTranslation;
	});

	function wordClicked(i: number): any {
		if (translation().type === 'verse') {
			// Set l'indice du mot sélectionné dans la traduction
			if (i < translation().startWordIndex) {
				// Si le mot est avant le début de la traduction, on le sélectionne
				translation().startWordIndex = i;
			} else {
				// Sinon, on le sélectionne comme fin de la traduction
				translation().endWordIndex = i;
			}
		}
	}

	$inspect(translation().endWordIndex);
</script>

<div class="flex flex-col gap-x-2 mt-4">
	<p class="text-secondary text-sm">{edition.language} - {edition.author}</p>

	{#if translation().type === 'verse'}
		{@const originalTranslation = globalState.getProjectTranslation.getVerseTranslation(
			edition,
			subtitle
		)}

		<!-- Affiche la traduction complète du verset mot à mot -->
		<div class="flex flex-row space-x-1.75">
			{#each originalTranslation.split(' ') as word, i}
				<button
					class="text-md cursor-pointer {translation().startWordIndex <= i &&
					i <= translation().endWordIndex
						? 'bg-red-900'
						: ''}"
					onclick={() => wordClicked(i)}
				>
					{word}</button
				>
			{/each}
		</div>
	{/if}
</div>

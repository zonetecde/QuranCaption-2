<script lang="ts">
	import type { Edition, SubtitleClip, Translation } from '$lib/classes';
	import { VerseTranslation } from '$lib/classes/Translation.svelte';
	import { globalState } from '$lib/runes/main.svelte';
	import { onMount } from 'svelte';
	import { fade, slide } from 'svelte/transition';

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
	// Variables pour gérer le glisser-déposer
	let isDragging = $state(false);
	let dragStartIndex = $state(-1);
	let isHovered = $state(false);

	let originalTranslation: string = $state('');

	onMount(() => {
		originalTranslation = globalState.getProjectTranslation.getVerseTranslation(edition, subtitle);
	});

	function wordClicked(i: number): any {
		if (translation().type === 'verse') {
			if (i < translation().startWordIndex) {
				// Si le mot est avant le début de la traduction, on le sélectionne
				translation().startWordIndex = i;
				translation().endWordIndex = i;
			} else if (i > translation().endWordIndex) {
				// Si le mot est après la fin de la traduction, on étend la sélection
				translation().endWordIndex = i;
			} else {
				// Si le mot est déjà sélectionné, on le désélectionne
				if (i >= translation().startWordIndex && i <= translation().endWordIndex) {
					translation().startWordIndex = i;
					translation().endWordIndex = i;
				}
			}

			updateTranslationText();
		}
	}

	function updateTranslationText() {
		translation().text = originalTranslation
			.split(' ')
			.slice(translation().startWordIndex, translation().endWordIndex + 1)
			.join(' ');
	}

	function handleMouseDown(i: number, event: MouseEvent): void {
		if (translation().type === 'verse') {
			event.preventDefault();
			isDragging = true;
			dragStartIndex = i;
			wordClicked(i);
		}
	}

	function handleMouseEnter(i: number): void {
		if (isDragging && translation().type === 'verse') {
			const startIndex = Math.min(dragStartIndex, i);
			const endIndex = Math.max(dragStartIndex, i);
			translation().startWordIndex = startIndex;
			translation().endWordIndex = endIndex;
			updateTranslationText();
		}
	}

	function handleMouseUp(): void {
		isDragging = false;
		dragStartIndex = -1;
	}

	// Gestionnaire global pour le mouseup
	function handleGlobalMouseUp(): void {
		if (isDragging) {
			handleMouseUp();
		}
	}
</script>

<div
	class="flex flex-col gap-3 mt-4 p-4 bg-accent border border-color rounded-lg transition-all duration-200"
	onmouseenter={() => (isHovered = true)}
	onmouseleave={() => {
		handleMouseUp();
		isHovered = false;
	}}
>
	<!-- En-tête avec flag et info -->
	<div class="flex items-center gap-3 pb-2 border-b border-color">
		<div class="flex items-center gap-2">
			{#if globalState.availableTranslations && globalState.availableTranslations[edition.language]}
				<img
					src={globalState.availableTranslations[edition.language].flag}
					alt={edition.language}
					class="w-5 h-5 rounded"
				/>
			{/if}
			<div>
				<p class="text-primary text-sm font-medium">{edition.language}</p>
				<p class="text-thirdly text-xs">{edition.author}</p>
			</div>
		</div>
	</div>
	{#if translation().type === 'verse'}
		{#if isHovered}
			<!-- Affiche la traduction complète du verset mot à mot -->
			<div
				class="flex flex-row select-none flex-wrap items-center gap-y-1"
				role="presentation"
				onmouseup={handleGlobalMouseUp}
				transition:fade
			>
				{#each originalTranslation.split(' ') as word, i}
					{@const isSelected = translation().startWordIndex <= i && i <= translation().endWordIndex}
					{@const isFirstSelected = isSelected && i === translation().startWordIndex}
					{@const isLastSelected = isSelected && i === translation().endWordIndex}
					{@const isSingleSelected =
						isSelected && translation().startWordIndex === translation().endWordIndex}
					{@const isMiddleSelected = isSelected && !isFirstSelected && !isLastSelected}

					<button
						class="translation-word text-sm cursor-pointer px-1 py-1 transition-all duration-200 border-2 border-transparent
						       {isSelected
							? `translation-word-selected text-white ${
									isSingleSelected
										? 'translation-word-first-selected translation-word-last-selected'
										: isLastSelected
											? 'translation-word-first-selected'
											: isFirstSelected
												? 'translation-word-last-selected'
												: 'translation-word-middle-selected'
								}`
							: 'translation-word-not-selected text-secondary hover:bg-bg-secondary hover:border-border-color hover:text-primary rounded-md'}
						       {isDragging ? 'select-none' : ''}"
						onmousedown={(event) => handleMouseDown(i, event)}
						onmouseenter={() => handleMouseEnter(i)}
						ondragstart={(event) => event.preventDefault()}
					>
						{word}
					</button>
				{/each}
			</div>
		{/if}

		<!-- Indicateur de sélection - toujours visible -->
		{#if translation().startWordIndex !== -1 && translation().endWordIndex !== -1}
			<div class="p-2 bg-secondary border border-color rounded-md">
				<p class="text-xs text-thirdly mb-1">Subtitle translation:</p>
				<p class="text-sm font-medium">
					{translation().text}
				</p>
			</div>
		{/if}
	{/if}
</div>

<style>
	.translation-word {
		border-left: 0px solid var(--accent-primary);
		border-right: 0px solid var(--accent-primary);
	}

	.translation-word-selected {
		background-color: var(--selected-word-bg);
		border-top: 2px solid var(--accent-primary);
		border-bottom: 2px solid var(--accent-primary);
	}

	.translation-word-first-selected {
		border-right: 2px solid var(--accent-primary);
		border-left: 0px solid var(--accent-primary);

		border-radius: 0 8px 8px 0;

		margin-left: 0;
	}

	.translation-word-last-selected {
		border-left: 2px solid var(--accent-primary);
		border-right: 0px solid var(--accent-primary);

		border-radius: 8px 0 0 8px;
		margin-right: 0;
	}

	/* Si un seul mot est sélectionné, il doit avoir des bords arrondis partout */
	.translation-word-first-selected.translation-word-last-selected {
		border-radius: 8px;
		border: 2px solid var(--accent-primary);
		margin-left: 0;
		margin-right: 0;
	}

	.translation-word-selected:hover {
		background: var(--bg-accent);
		z-index: 10;
		position: relative;
	}

	.translation-word-not-selected:hover {
		background-color: var(--bg-accent);
		border-color: var(--border-color);
		color: var(--text-primary);
	}
</style>

<script lang="ts">
	import { TrackType } from '$lib/classes';
	import type { Verse, Word } from '$lib/classes/Quran';
	import { globalState } from '$lib/runes/main.svelte';
	import ShortcutService from '$lib/services/ShortcutService';
	import { onDestroy, onMount } from 'svelte';

	let {
		selectedVerse,
		goNextVerse,
		goPreviousVerse,
		getSurahNumber
	}: {
		selectedVerse: () => Promise<Verse | undefined>;
		goNextVerse: () => void;
		goPreviousVerse: () => void;
		getSurahNumber: () => number;
	} = $props();

	let firstWordIndex = $state(0);
	let lastWordIndex = $state(0);

	onMount(() => {
		// Set up les shortcuts pour sélectionner les mots
		ShortcutService.registerShortcut({
			key: 'ArrowUp',
			description: 'Select Next Word',
			category: 'Subtitles Editor',
			onKeyDown: selectNextWord
		});

		ShortcutService.registerShortcut({
			key: 'ArrowDown',
			description: 'Select Previous Word',
			category: 'Subtitles Editor',
			onKeyDown: selectPreviousWord
		});

		// Set up les shortcuts divers
		ShortcutService.registerShortcut({
			key: 'r',
			description: 'Put the start-of-selection cursor on the end-of-selection cursor.',
			category: 'Subtitles Editor',
			onKeyDown: () => {
				firstWordIndex = lastWordIndex;
			}
		});

		ShortcutService.registerShortcut({
			key: 'v',
			description: 'Select all words in the verse.',
			category: 'Subtitles Editor',
			onKeyDown: async () => {
				firstWordIndex = 0;
				lastWordIndex = (await selectedVerse())!.words.length - 1;
			}
		});

		ShortcutService.registerShortcut({
			key: 'c',
			description: 'Put the end-of-selection cursor on the last word of the verse.',
			category: 'Subtitles Editor',
			onKeyDown: async () => {
				lastWordIndex = (await selectedVerse())!.words.length - 1;
			}
		});

		// Set up les shortcuts d'action
		ShortcutService.registerShortcut({
			key: 'Enter',
			description: 'Add a subtitle with the selected words.',
			category: 'Subtitles Editor',
			onKeyDown: addSubtitle
		});
	});

	onDestroy(() => {
		// Clean up les shortcuts
		ShortcutService.unregisterShortcut('ArrowUp');
		ShortcutService.unregisterShortcut('ArrowDown');
		ShortcutService.unregisterShortcut('r');
		ShortcutService.unregisterShortcut('v');
		ShortcutService.unregisterShortcut('c');
	});

	/**
	 * Sélectionne le mot suivant dans le verset.
	 * Si on est à la fin du verset, passe au verset suivant.
	 */
	async function selectNextWord() {
		if (lastWordIndex < (await selectedVerse())!.words.length - 1) {
			lastWordIndex += 1;
		} else {
			// Passe au verse suivant si on est à la fin du verset
			goNextVerse();
		}
	}

	/**
	 * Sélectionne le mot précédent dans le verset.
	 * Si on est au début du verset, passe au verset précédent.
	 */
	async function selectPreviousWord() {
		if (lastWordIndex > firstWordIndex) {
			lastWordIndex -= 1;
		} else if (firstWordIndex > 0) {
			firstWordIndex -= 1;
			lastWordIndex -= 1;
		} else {
			// Passe au verse précédent si on est au début du verset
			goPreviousVerse();
		}
	}

	async function addSubtitle() {
		// Ajoute une sous-titre avec les mots sélectionnés
		const verse = await selectedVerse();
		if (!verse) return;

		const subtitleTrack = globalState.currentProject!.content.timeline.getFirstTrack(
			TrackType.Subtitle
		)!;

		subtitleTrack.addSubtitle(verse, firstWordIndex, lastWordIndex, getSurahNumber());

		await selectNextWord();
		firstWordIndex = lastWordIndex;
	}

	export function resetFirstAndLastWordIndex() {
		firstWordIndex = 0;
		lastWordIndex = 0;
	}
</script>

<section
	class="w-full items-center h-full flex flex-row-reverse py-10 xl:leading-[4.5rem] leading-[4rem] my-auto px-6 overflow-y-auto xl:pb-20 flex-wrap text-4xl xl:text-5xl arabic content-center"
>
	{#await selectedVerse() then verse}
		{#if verse}
			{#each verse.words as word, index}
				{@const isSelected = index >= firstWordIndex && index <= lastWordIndex}

				<button
					class={'flex flex-col outline-none text-center px-2.5 pt-2 pb-2 cursor-pointer ' +
						(isSelected ? 'word-selected' : 'word-not-selected')}
				>
					<p class="text-center w-full">{word.arabic}</p>
					<p class="xl:text-sm text-xs text-thirdly">{word.translation}</p>
				</button>
			{/each}
		{/if}
	{:catch error}
		<p class="text-red-500">Error loading verse: {error.message}</p>
	{/await}
</section>

<style>
	.word-selected {
		background-color: #fbff0027;
	}

	.word-selected:hover {
		background-color: #5f5b20e1;
	}

	.word-not-selected:hover {
		background-color: #ffffff2f;
	}
</style>

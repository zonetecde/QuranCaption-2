<script lang="ts">
	import { TrackType } from '$lib/classes';
	import { Quran, type Verse, type Word } from '$lib/classes/Quran';
	import { globalState } from '$lib/runes/main.svelte';
	import ShortcutService from '$lib/services/ShortcutService';
	import { onDestroy, onMount } from 'svelte';

	let subtitlesEditorState = $derived(
		() => globalState.currentProject!.projectEditorState.subtitlesEditor
	);

	function goNextVerse() {
		if (
			subtitlesEditorState().selectedVerse <
			Quran.getVerseCount(subtitlesEditorState().selectedSurah)
		) {
			subtitlesEditorState().selectedVerse += 1;
			resetFirstAndLastWordIndex();
		}
	}

	function goPreviousVerse() {
		if (subtitlesEditorState().selectedVerse > 1) {
			subtitlesEditorState().selectedVerse -= 1;
			resetFirstAndLastWordIndex();
		}
	}

	let selectedVerse = $derived(
		async () =>
			await Quran.getVerse(
				subtitlesEditorState().selectedSurah,
				subtitlesEditorState().selectedVerse
			)
	);

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
				subtitlesEditorState().startWordIndex = subtitlesEditorState().endWordIndex;
			}
		});

		ShortcutService.registerShortcut({
			key: 'v',
			description: 'Select all words in the verse.',
			category: 'Subtitles Editor',
			onKeyDown: async () => {
				subtitlesEditorState().startWordIndex = 0;
				subtitlesEditorState().endWordIndex = (await selectedVerse())!.words.length - 1;
			}
		});

		ShortcutService.registerShortcut({
			key: 'c',
			description: 'Put the end-of-selection cursor on the last word of the verse.',
			category: 'Subtitles Editor',
			onKeyDown: async () => {
				subtitlesEditorState().endWordIndex = (await selectedVerse())!.words.length - 1;
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
		ShortcutService.unregisterShortcut('Enter');
	});

	/**
	 * Sélectionne le mot suivant dans le verset.
	 * Si on est à la fin du verset, passe au verset suivant.
	 */
	async function selectNextWord() {
		if (subtitlesEditorState().endWordIndex < (await selectedVerse())!.words.length - 1) {
			subtitlesEditorState().endWordIndex += 1;
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
		if (subtitlesEditorState().endWordIndex > subtitlesEditorState().startWordIndex) {
			subtitlesEditorState().endWordIndex -= 1;
		} else if (subtitlesEditorState().startWordIndex > 0) {
			subtitlesEditorState().startWordIndex -= 1;
			subtitlesEditorState().endWordIndex -= 1;
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

		const success = subtitleTrack.addSubtitle(
			verse,
			subtitlesEditorState().startWordIndex,
			subtitlesEditorState().endWordIndex,
			subtitlesEditorState().selectedSurah
		);

		if (success) {
			await selectNextWord();
			subtitlesEditorState().startWordIndex = subtitlesEditorState().endWordIndex;
		}
	}

	export function resetFirstAndLastWordIndex() {
		subtitlesEditorState().startWordIndex = 0;
		subtitlesEditorState().endWordIndex = 0;
	}
</script>

<section
	class="w-full items-center h-full flex flex-row-reverse py-10 xl:leading-[4.5rem] leading-[4rem] my-auto px-6 overflow-y-auto xl:pb-20 flex-wrap text-4xl xl:text-5xl arabic content-center"
>
	{#await selectedVerse() then verse}
		{#if verse}
			{#each verse.words as word, index}
				{@const isSelected =
					index >= subtitlesEditorState().startWordIndex &&
					index <= subtitlesEditorState().endWordIndex}

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

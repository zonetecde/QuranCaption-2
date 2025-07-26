<script lang="ts">
	import { TrackType } from '$lib/classes';
	import { Quran, type Verse, type Word } from '$lib/classes/Quran';
	import { globalState } from '$lib/runes/main.svelte';
	import ShortcutService, { SHORTCUTS } from '$lib/services/ShortcutService';
	import { onDestroy, onMount } from 'svelte';
	import toast from 'svelte-5-french-toast';

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
			key: SHORTCUTS.SUBTITLES_EDITOR.SELECT_NEXT_WORD,
			onKeyDown: selectNextWord
		});

		ShortcutService.registerShortcut({
			key: SHORTCUTS.SUBTITLES_EDITOR.SELECT_PREVIOUS_WORD,
			onKeyDown: selectPreviousWord
		});

		// Set up les shortcuts divers
		ShortcutService.registerShortcut({
			key: SHORTCUTS.SUBTITLES_EDITOR.RESET_START_CURSOR,
			onKeyDown: () => {
				subtitlesEditorState().startWordIndex = subtitlesEditorState().endWordIndex;
			}
		});

		ShortcutService.registerShortcut({
			key: SHORTCUTS.SUBTITLES_EDITOR.SELECT_ALL_WORDS,
			onKeyDown: async () => {
				subtitlesEditorState().startWordIndex = 0;
				subtitlesEditorState().endWordIndex = (await selectedVerse())!.words.length - 1;
			}
		});

		ShortcutService.registerShortcut({
			key: SHORTCUTS.SUBTITLES_EDITOR.SET_END_TO_LAST,
			onKeyDown: async () => {
				subtitlesEditorState().endWordIndex = (await selectedVerse())!.words.length - 1;
			}
		});

		// Set up les shortcuts d'action
		ShortcutService.registerShortcut({
			key: SHORTCUTS.SUBTITLES_EDITOR.ADD_SUBTITLE,
			onKeyDown: addSubtitle
		});

		ShortcutService.registerShortcut({
			key: SHORTCUTS.SUBTITLES_EDITOR.REMOVE_LAST_SUBTITLE,
			onKeyDown: removeLastSubtitle
		});

		ShortcutService.registerShortcut({
			key: SHORTCUTS.SUBTITLES_EDITOR.ADD_SILENCE,
			onKeyDown: addSilence
		});

		ShortcutService.registerShortcut({
			key: SHORTCUTS.SUBTITLES_EDITOR.SET_LAST_SUBTITLE_END,
			onKeyDown: setLastSubtitleEnd
		});
	});

	onDestroy(() => {
		// Clean up les shortcuts
		ShortcutService.unregisterShortcut(SHORTCUTS.SUBTITLES_EDITOR.SELECT_NEXT_WORD);
		ShortcutService.unregisterShortcut(SHORTCUTS.SUBTITLES_EDITOR.SELECT_PREVIOUS_WORD);
		ShortcutService.unregisterShortcut(SHORTCUTS.SUBTITLES_EDITOR.RESET_START_CURSOR);
		ShortcutService.unregisterShortcut(SHORTCUTS.SUBTITLES_EDITOR.SELECT_ALL_WORDS);
		ShortcutService.unregisterShortcut(SHORTCUTS.SUBTITLES_EDITOR.SET_END_TO_LAST);
		ShortcutService.unregisterShortcut(SHORTCUTS.SUBTITLES_EDITOR.ADD_SUBTITLE);
		ShortcutService.unregisterShortcut(SHORTCUTS.SUBTITLES_EDITOR.REMOVE_LAST_SUBTITLE);
		ShortcutService.unregisterShortcut(SHORTCUTS.SUBTITLES_EDITOR.ADD_SILENCE);
		ShortcutService.unregisterShortcut(SHORTCUTS.SUBTITLES_EDITOR.SET_LAST_SUBTITLE_END);
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

	/**
	 * Ajoute une sous-titre avec les mots sélectionnés.
	 */
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

	/**
	 * Ajoute un silence à la timeline (shortcut ADD_SILENCE).
	 * Utilisé pour ajouter un espace vide entre les sous-titres.
	 */
	function addSilence(): void {
		const subtitleTrack = globalState.currentProject!.content.timeline.getFirstTrack(
			TrackType.Subtitle
		)!;

		subtitleTrack.addSilence();
	}

	/**
	 * Réinitialise les indices de début et de fin des mots sélectionnés.
	 * Utilisé pour réinitialiser la sélection après un changement de verset
	 */
	function resetFirstAndLastWordIndex() {
		subtitlesEditorState().startWordIndex = 0;
		subtitlesEditorState().endWordIndex = 0;
	}

	/**
	 * Supprime le dernier sous-titre de la timeline (shortcut REMOVE_LAST_SUBTITLE).
	 */
	function removeLastSubtitle(): void {
		const subtitleTrack = globalState.currentProject!.content.timeline.getFirstTrack(
			TrackType.Subtitle
		)!;

		subtitleTrack.removeLastClip();
	}

	/**
	 * Définit la fin du dernier sous-titre à la position actuelle du curseur (shortcut SET_LAST_SUBTITLE_END).
	 */
	function setLastSubtitleEnd(): void {
		const subtitleTrack = globalState.currentProject!.content.timeline.getFirstTrack(
			TrackType.Subtitle
		)!;

		const lastSubtitle = subtitleTrack.getLastClip();
		if (lastSubtitle) {
			lastSubtitle.setEndTime(
				globalState.currentProject!.projectEditorState.timeline.cursorPosition
			);
		}
	}

	/**
	 * Gère le clic sur un mot dans le sélecteur de mots.
	 * Met à jour les indices de début et de fin des mots sélectionnés.
	 * @param wordIndex L'index du mot cliqué.
	 */
	function handleWordClick(wordIndex: number): any {
		if (wordIndex < subtitlesEditorState().startWordIndex) {
			subtitlesEditorState().startWordIndex = wordIndex;
			subtitlesEditorState().endWordIndex = wordIndex;
		} else if (wordIndex > subtitlesEditorState().endWordIndex) {
			subtitlesEditorState().endWordIndex = wordIndex;
		} else {
			// Si le mot est déjà sélectionné, on le désélectionne
			if (
				wordIndex >= subtitlesEditorState().startWordIndex &&
				wordIndex <= subtitlesEditorState().endWordIndex
			) {
				subtitlesEditorState().startWordIndex = wordIndex;
				subtitlesEditorState().endWordIndex = wordIndex;
			}
		}
	}
</script>

<section
	class="w-full items-center h-full flex flex-row-reverse py-10 xl:leading-[4.5rem] leading-[4rem] my-auto px-6 overflow-y-auto xl:pb-20 flex-wrap text-4xl xl:text-5xl arabic content-center pt-40 2xl:pt-0"
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
					onclick={() => handleWordClick(index)}
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

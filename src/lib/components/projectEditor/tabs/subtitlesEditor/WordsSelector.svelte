<script lang="ts">
	import { TrackType } from '$lib/classes';
	import type { PredefinedSubtitleType } from '$lib/classes/Clip.svelte';
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

		ShortcutService.registerShortcut({
			key: SHORTCUTS.SUBTITLES_EDITOR.ADD_BASMALA,
			onKeyDown: () => addPredefinedSubtitle('بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ', 'Basmala')
		});

		ShortcutService.registerShortcut({
			key: SHORTCUTS.SUBTITLES_EDITOR.ADD_ISTIADHAH,
			onKeyDown: () =>
				addPredefinedSubtitle('أَعُوذُ بِاللَّهِ مِنَ الشَّيْطَانِ الرَّجِيمِ', 'Istiadhah')
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
		ShortcutService.unregisterShortcut(SHORTCUTS.SUBTITLES_EDITOR.ADD_BASMALA);
		ShortcutService.unregisterShortcut(SHORTCUTS.SUBTITLES_EDITOR.ADD_ISTIADHAH);
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

		const subtitleTrack = globalState.getSubtitleTrack;

		const success = subtitleTrack.addSubtitle(
			verse,
			subtitlesEditorState().startWordIndex,
			subtitlesEditorState().endWordIndex,
			subtitlesEditorState().selectedSurah
		);

		if (success) {
			await selectNextWord();
			subtitlesEditorState().startWordIndex = subtitlesEditorState().endWordIndex;
			globalState.currentProject!.detail.updatePercentageCaptioned();
		}
	}

	/**
	 * Ajoute un silence à la timeline (shortcut ADD_SILENCE).
	 * Utilisé pour ajouter un espace vide entre les sous-titres.
	 */
	function addSilence(): void {
		const subtitleTrack = globalState.getSubtitleTrack;

		const success = subtitleTrack.addSilence();
		if (success) globalState.currentProject!.detail.updatePercentageCaptioned();
	}

	function addPredefinedSubtitle(text: string, type: PredefinedSubtitleType) {
		const subtitleTrack = globalState.getSubtitleTrack;

		const success = subtitleTrack.addPredefinedSubtitle(text, type);
		if (success) globalState.currentProject!.detail.updatePercentageCaptioned();
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
		const subtitleTrack = globalState.getSubtitleTrack;

		subtitleTrack.removeLastClip();

		globalState.currentProject!.detail.updatePercentageCaptioned();
	}

	/**
	 * Définit la fin du dernier sous-titre à la position actuelle du curseur (shortcut SET_LAST_SUBTITLE_END).
	 */
	function setLastSubtitleEnd(): void {
		const subtitleTrack = globalState.getSubtitleTrack;

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

<section class="w-full h-full overflow-y-auto bg-secondary border border-color rounded-lg">
	<div
		class="min-h-full flex flex-row-reverse flex-wrap justify-start content-center xl:leading-[4.5rem] lg:leading-[3rem] leading-[2.5rem]
	           px-6 text-4xl xl:text-5xl arabic py-4"
	>
		{#await selectedVerse() then verse}
			{#if verse}
				{#each verse.words as word, index}
					{@const isSelected =
						index >= subtitlesEditorState().startWordIndex &&
						index <= subtitlesEditorState().endWordIndex}
					{@const isFirstSelected = isSelected && index === subtitlesEditorState().startWordIndex}
					{@const isLastSelected = isSelected && index === subtitlesEditorState().endWordIndex}
					{@const isSingleSelected =
						isSelected &&
						subtitlesEditorState().startWordIndex === subtitlesEditorState().endWordIndex}
					{@const isMiddleSelected = isSelected && !isFirstSelected && !isLastSelected}

					<button
						class="word-button flex h-fit flex-col outline-none text-center px-3 cursor-pointer
					       transition-all border-2 duration-200 border-transparent py-3 -mx-0.5
					       {isSelected
							? `word-selected text-white  ${
									isSingleSelected
										? 'word-first-selected word-last-selected'
										: isLastSelected
											? 'word-first-selected'
											: isFirstSelected
												? 'word-last-selected'
												: 'word-middle-selected'
								}`
							: 'word-not-selected text-primary hover:bg-accent hover:border-color rounded-lg'}"
						onclick={() => handleWordClick(index)}
					>
						<p class="text-center w-full font-medium">{word.arabic}</p>
						{#if subtitlesEditorState().showWordTranslation}
							<p class="xl:text-sm text-xs text-thirdly mt-1 font-normal opacity-80">
								{word.translation}
							</p>
						{/if}
						{#if subtitlesEditorState().showWordTransliteration}
							<p class="xl:text-sm text-xs text-thirdly mt-0.5 font-normal opacity-70 italic">
								{word.transliteration}
							</p>
						{/if}
					</button>
				{/each}
			{/if}
		{:catch error}
			<div class="w-full flex items-center justify-center p-8">
				<div class="bg-red-500/10 border border-red-500/30 rounded-lg p-4 flex items-center gap-3">
					<span class="material-icons text-red-400">error</span>
					<p class="text-red-400 text-sm">Error loading verse: {error.message}</p>
				</div>
			</div>
		{/await}
	</div>
</section>

<style>
	.word-selected {
		background-color: var(--selected-word-bg);
		border-top: 2px solid var(--accent-primary);
		border-bottom: 2px solid var(--accent-primary);
	}

	.word-first-selected {
		border-left: 2px solid var(--accent-primary);
		border-radius: 12px 0 0 12px;
	}

	.word-last-selected {
		border-right: 2px solid var(--accent-primary);
		border-radius: 0 12px 12px 0;
	}

	.word-middle-selected {
		border-radius: 0;
		border-left: 2px solid transparent;
		border-right: 2px solid transparent;
	}

	/* Si un seul mot est sélectionné, il doit avoir des bords arrondis partout */
	.word-first-selected.word-last-selected {
		border-radius: 12px;
		border: 2px solid var(--accent-primary);
	}

	.word-selected:hover {
		background: var(--bg-accent);
		z-index: 10;
		position: relative;
	}

	.word-not-selected:hover {
		background-color: var(--bg-accent);
		border-color: var(--border-color);
	}
</style>

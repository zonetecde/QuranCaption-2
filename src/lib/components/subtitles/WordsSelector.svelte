<script lang="ts">
	import Id from '$lib/ext/Id';
	import {
		currentProject,
		getDefaultsTranslationSettings,
		hasSubtitleDefaultIndividualSettings
	} from '$lib/stores/ProjectStore';
	import { getNumberOfVerses, getVerse, splitVerseInWords } from '$lib/stores/QuranStore';
	import { cursorPosition } from '$lib/stores/TimelineStore';
	import { onDestroy, onMount } from 'svelte';
	import toast from 'svelte-french-toast';

	import { readjustCursorPosition } from '$lib/functions/TimelineHelper';
	import { getVerseTranslation } from '$lib/functions/Translation';
	import { getWordByWordTranslation } from '$lib/functions/Wbw';
	import {
		addOtherTextsPopupVisibility,
		beginTimeReplacing,
		clearBeginAndEndTimeReplacing,
		clearSubtitleToEdit,
		currentlyEditedSubtitleId,
		endTimeReplacing,
		isRemplacingAlreadyAddedSubtitles,
		setSubtitleToEdit,
		showWordByWordTranslation,
		showWordByWordTransliteration
	} from '$lib/stores/LayoutStore';
	import {
		getNumberOfVersesOfText,
		getTextTranslations,
		getVerseFromText,
		OtherTexts
	} from '$lib/stores/OtherTextsStore';
	import { getCurrentCursorTime } from '$lib/stores/VideoPreviewStore';

	export let verseNumber: number;
	export let surahNumber: number;
	export let selectedTextId: number | null = null;

	let wbwTranslation: string[] = [];
	let wbwTransliteration: string[] = [];

	// Hook when a subtitle is clicked
	$: if ($currentlyEditedSubtitleId) {
		setSubtitleToBeEdited($currentlyEditedSubtitleId);
	}

	// Enter edit mode to edit a subtitle
	async function setSubtitleToBeEdited(subtitleId: string) {
		// Récupère le sous-titre à éditer
		let subtitleClips = $currentProject.timeline.subtitlesTracks[0].clips;
		let subtitle = subtitleClips.find((clip) => clip.id === subtitleId);

		if (!subtitle) return;

		if (subtitle.surah < 0) {
			// custom text
			selectedTextId = subtitle.surah;
			verseNumber = subtitle.verse;
		} else {
			verseNumber = subtitle.verse;
			surahNumber = subtitle.surah;
		}

		// wait for UI to update
		await new Promise((resolve) => setTimeout(resolve, 0));

		startWordIndex = subtitle.firstWordIndexInVerse;
		endWordIndex = subtitle.lastWordIndexInVerse;
	}

	// Split the verse into words
	$: wordsInSelectedVerse = selectedTextId
		? getVerseFromText(selectedTextId, verseNumber).split('***')
		: splitVerseInWords(getVerse(surahNumber, verseNumber).text);

	// Si on change de verset, on sélectionne le premier mot par défaut
	$: if (verseNumber || surahNumber) {
		// Select the first word by default when the verse changes
		startWordIndex = 0;
		endWordIndex = 0;
	}

	// Select the words between startWordIndex and endWordIndex
	let startWordIndex = 0;
	let endWordIndex = 0;

	onMount(async () => {
		// Le met sur le document car le window.onkeydown est déjà pris dans +layout.svelte
		window.document.onkeydown = onKeyDown;

		if (!selectedTextId) {
			wbwTranslation = await getWordByWordTranslation(surahNumber, verseNumber);
			wbwTransliteration = await getWordByWordTranslation(
				surahNumber,
				verseNumber,
				'transliteration'
			);
		}
	});

	$: if ((surahNumber || verseNumber) && !selectedTextId) {
		wbwTranslation = [];
		getWordByWordTranslation(surahNumber, verseNumber).then((translation) => {
			wbwTranslation = translation;
		});
		wbwTransliteration = [];
		getWordByWordTranslation(surahNumber, verseNumber, 'transliteration').then((translation) => {
			wbwTransliteration = translation;
		});
	}

	onDestroy(() => {
		window.document.onkeydown = null;
	});

	/**
	 * Sélectionne le mot suivant
	 * Ou, s'il n'y a plus de mots, passe au verset suivant
	 * @param removeAllSection Si vrai, supprime la sélection actuelle pour ne sélectionner que le prochain mot
	 */
	function selectNextWord(removeAllSection = false) {
		// Dans le cas où on veut avancer le curseur (plusieurs mots sélectionnés)
		if (endWordIndex < wordsInSelectedVerse.length - 1) {
			endWordIndex += 1;

			if (removeAllSection) startWordIndex = endWordIndex;
		} else {
			// Verset suivant s'il existe
			if (
				verseNumber <
				(selectedTextId ? getNumberOfVersesOfText(selectedTextId) : getNumberOfVerses(surahNumber))
			) {
				verseNumber += 1;
			}
		}
	}

	/**
	 * Sélectionne le mot précédent
	 * Ou, s'il n'y a plus de mots, passe au verset précédent
	 */
	function selectPreviousWord() {
		// Dans le cas où on veut reculer le curseur (plusieurs mots sélectionnés)
		if (endWordIndex > startWordIndex) {
			endWordIndex -= 1;
		} else {
			// Dans le cas où on veut reculer le curseur (le mot sélectionné est au milieu du verset)
			if (startWordIndex > 0) {
				// Recule les deux curseurs
				startWordIndex -= 1;
				endWordIndex -= 1;
			} else {
				// Verset précédent s'il existe
				if (verseNumber > 1) {
					verseNumber -= 1;
					// Bypass la remise à zéro des curseurs pour le mettre à la fin du verset précédent
					setTimeout(() => {
						startWordIndex = getVerse(surahNumber, verseNumber).text.split(' ').length - 1;
						endWordIndex = startWordIndex;
					}, 0);
				}
			}
		}
	}

	/**
	 * Gère le clic sur un mot
	 * @param index Index du mot dans le verset
	 * @param isHighlighted Si le mot est déjà sélectionné
	 */
	function handleWordClicked(event: any, index: number, isHighlighted: boolean): any {
		// Si le mot est après l'index de départ et que le mot n'est pas déjà sélectionné
		if (index > startWordIndex && !isHighlighted) {
			endWordIndex = index;
		}
		// Si le mot est avant l'index de départ et que le mot n'est pas déjà sélectionné
		else if (index < startWordIndex && !isHighlighted) {
			startWordIndex = index;
		}
		// Sinon, si le mot est déjà sélectionné alors on ne sélectionne que ce mot
		else if (isHighlighted) {
			startWordIndex = index;
			endWordIndex = index;
		}

		// remove focus
		event.target.blur();
	}

	/**
	 * Gère les événements de touche clavier
	 * @param event Événement de touche clavier
	 */
	function onKeyDown(event: KeyboardEvent) {
		// Check if the user is typing in an input
		if (document.activeElement && document.activeElement.tagName === 'INPUT') return;
		if ($addOtherTextsPopupVisibility) return; // Si le popup est ouvert, on ne fait rien

		if (event.key === 'ArrowUp') {
			selectNextWord();
		} else if (event.key === 'ArrowDown') {
			selectPreviousWord();
		} else if (event.key === 'Enter') {
			const selectedWords = wordsInSelectedVerse
				.slice(startWordIndex, endWordIndex + 1)
				.join(selectedTextId ? ' *** ' : ' '); // Pour les autres textes ce sont des vers entiers, et c'est deux par deux donc on sépare par ***
			if (selectedWords.length > 0) {
				if ($isRemplacingAlreadyAddedSubtitles) {
					// Remplace les sous-titres présent entre les temps de début et de fin par le texte sélectionné
					replaceSubtitles(selectedWords);
				} else if ($currentlyEditedSubtitleId) {
					editSubtitle(selectedWords);
				} else {
					// Ajoute le sous-titre
					const temp = $currentProject.timeline.subtitlesTracks[0].clips.length;
					addSubtitle(selectedWords);
					// Vérifie qu'il n'y a pas eu d'erreur lors de l'ajout
					if (temp < $currentProject.timeline.subtitlesTracks[0].clips.length) selectNextWord(true);
				}
			}
		} else if (event.key === 'b' || event.key === 'B') {
			// Ajoute la basmallah
			addSubtitle('بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ', true);
		} else if (event.key === 'a' || event.key === 'A') {
			// Ajoute la protection
			addSubtitle('أَعُوذُ بِاللَّهِ مِنَ الشَّيْطَانِ الرَّجِيمِ', true);
		} else if ((event.key === 's' || event.key === 'S') && !event.ctrlKey) {
			// Ajoute un silence
			addSubtitle('', true, true);
		} else if (event.key === 'Backspace' || event.key === 'Delete') {
			removeLastSubtitle();
		} else if (event.key === 'v' || event.key === 'V') {
			// Sélectionne tout les mots du verset
			startWordIndex = 0;
			endWordIndex = wordsInSelectedVerse.length - 1;
		} else if (event.key === 't' || event.key === 'T') {
			// Ajoute un texte custom
			addSubtitle('', true, false, true);
		} else if (event.key === 'e' || event.key === 'E') {
			// Edit le dernier sous-titre ajouté
			const subtitleClips = $currentProject.timeline.subtitlesTracks[0].clips;
			const lastSubtitle = subtitleClips[subtitleClips.length - 1];
			if (lastSubtitle) {
				// Met à jour le sous-titre à éditer
				setSubtitleToEdit(lastSubtitle.id);

				// Enlève le remplacage de sous-titres si il y en a
				clearBeginAndEndTimeReplacing();
			}
		} else if (event.key === 'm' || event.key === 'M') {
			// Change le temps de fin du dernier sous-titre ajouté à la position actuelle
			const subtitleClips = $currentProject.timeline.subtitlesTracks[0].clips;
			const lastSubtitle = subtitleClips[subtitleClips.length - 1];
			if (lastSubtitle) {
				if (lastSubtitle.start < $cursorPosition) {
					lastSubtitle.end = $cursorPosition;
					$currentProject.timeline.subtitlesTracks[0].clips = subtitleClips;
				} else {
					toast.error('The start time of the last subtitle is greater than the current time');
				}
			}
		} else if (event.key === 'r' || event.key === 'R') {
			// Reset le curseur de début à celui de fin
			startWordIndex = endWordIndex;
		} else if (event.key === 'c' || event.key === 'C') {
			// Sélectionne de l'indice de début actuel jusqu'à l'indice de fin max
			endWordIndex = wordsInSelectedVerse.length - 1;
		}
		// // Remplacer des sous-titres
		// else if (event.key === 'd') {
		// 	// set le temps de debut
		// 	beginTimeReplacing.set(getCurrentCursorTime());
		// 	// Enlève la fin si < début
		// 	if ($endTimeReplacing && $beginTimeReplacing! >= $endTimeReplacing) endTimeReplacing.set(0);
		// } else if (event.key === 'f') {
		// 	// set le temps de fin
		// 	endTimeReplacing.set(getCurrentCursorTime());
		// 	// Enlève le début si > fin
		// 	if ($beginTimeReplacing && $beginTimeReplacing >= $endTimeReplacing!)
		// 		beginTimeReplacing.set(0);
		// }
	}

	function editSubtitle(selectedWords: string) {
		// édite le sous-titre existant
		const subtitleClips = $currentProject.timeline.subtitlesTracks[0].clips;
		const subtitle = subtitleClips.find((clip) => clip.id === $currentlyEditedSubtitleId);
		if (subtitle) {
			subtitle.text = selectedWords;
			subtitle.verse = verseNumber;
			subtitle.surah = surahNumber;
			subtitle.firstWordIndexInVerse = startWordIndex;
			subtitle.lastWordIndexInVerse = endWordIndex;
			subtitle.isLastWordInVerse = endWordIndex === wordsInSelectedVerse.length - 1;
			$currentProject.timeline.subtitlesTracks[0].clips = subtitleClips;
		}

		clearSubtitleToEdit();
		// go to next word
		selectNextWord(true);
	}

	/*
	 * Remplace les sous-titres présent entre les temps de début et de fin par le texte sélectionné
	 */
	function replaceSubtitles(selectedWords: string) {
		if (!$beginTimeReplacing || !$endTimeReplacing) {
			toast.error('Set the begin and end time of your new subtitle');
		}
	}

	/**
	 * Supprime le dernier sous-titre
	 */
	function removeLastSubtitle() {
		let subtitleClips = $currentProject.timeline.subtitlesTracks[0].clips;

		if (subtitleClips.length > 0) {
			if (hasSubtitleDefaultIndividualSettings(subtitleClips[subtitleClips.length - 1].id)) {
				// remove it from the dic
				delete $currentProject.projectSettings.individualSubtitlesSettings[
					subtitleClips[subtitleClips.length - 1].id
				];
			}

			subtitleClips.pop();
		}

		$currentProject.timeline.subtitlesTracks[0].clips = subtitleClips;
	}

	/**
	 * Ajoute un sous-titre
	 * @param subtitleText Texte du sous-titre
	 * @param isNotVerse Si vrai, le sous-titre n'est pas un verset (la basmallah, la protection, etc.)
	 */
	async function addSubtitle(
		subtitleText: string,
		isNotVerse = false,
		isSilence = false,
		isCustomText = false
	) {
		// Ajoute le sous-titre à la liste des sous-titres
		let subtitleClips = $currentProject.timeline.subtitlesTracks[0].clips;

		let lastSubtitleEndTime =
			subtitleClips.length > 0 ? subtitleClips[subtitleClips.length - 1].end : 0;

		// Réajuste la position du curseur si on est sur la vidéo
		let currentTimeMs = getCurrentCursorTime();

		// Vérifie qu'on est pas au 0
		if (currentTimeMs < 100) {
			toast.error('Play the video to add a subtitle');
			return;
		}

		// Vérifie que la fin > début
		if (lastSubtitleEndTime >= currentTimeMs) {
			toast.error(
				'The end time of the previous subtitle is greater than or equal to the start time of the new subtitle'
			);
			return;
		}

		const subtitleId = Id.generate();
		subtitleClips.push({
			id: subtitleId,
			start: lastSubtitleEndTime,
			end: currentTimeMs,
			text: subtitleText,
			surah: isNotVerse ? -1 : selectedTextId || surahNumber,
			verse: isNotVerse ? -1 : verseNumber,
			translations: {},
			firstWordIndexInVerse: startWordIndex,
			lastWordIndexInVerse: endWordIndex,
			isSilence: isSilence,
			isLastWordInVerse: endWordIndex === wordsInSelectedVerse.length - 1,
			hadItTranslationEverBeenModified: false,
			isCustomText: isCustomText
		});

		// Met à jour la liste des sous-titres
		$currentProject.timeline.subtitlesTracks[0].clips = subtitleClips;

		// Si il y a des translations, les ajoutes
		let translations: { [key: string]: string } = {};

		if ($currentProject.projectSettings.addedTranslations.length > 0) {
			await Promise.all(
				$currentProject.projectSettings.addedTranslations.map(async (translation: string) => {
					if (!selectedTextId) {
						let translationText = isNotVerse
							? ''
							: await getVerseTranslation(translation, surahNumber, verseNumber);

						translations[translation] = translationText;
					} else {
						// Si c'est un autre texte, on ajoute sa traduction depuis le store
						const trans = getTextTranslations(selectedTextId, verseNumber)[translation];
						// Deux cas :
						// - on a sélectionné les deux sub-versets
						// - on a sélectionné un seul sub-verset
						if (startWordIndex === 0 && endWordIndex === wordsInSelectedVerse.length - 1) {
							translations[translation] = trans;
						} else {
							// Si c'est le premier subverset
							if (startWordIndex === 0) {
								translations[translation] = trans.split('***')[0];
							} else if (endWordIndex === wordsInSelectedVerse.length - 1) {
								// Si c'est le dernier sub
								translations[translation] = trans.split('***')[1];
							}
						}
					}
				})
			);

			// Met à jour les translations
			subtitleClips.find((clip) => clip.id === subtitleId)!.translations = translations;
		} else if (surahNumber < -1 && selectedTextId) {
			// Si c'est un autre texte, on ajoute sa traduction depuis le store
			translations = getTextTranslations(selectedTextId, verseNumber);

			subtitleClips.find((clip) => clip.id === subtitleId)!.translations = translations;

			for (const key in translations) {
				// si elle n'a pas été ajouté au projet, l'ajoute
				if (!$currentProject.projectSettings.addedTranslations.includes(key)) {
					$currentProject.projectSettings.subtitlesTracksSettings[key] =
						getDefaultsTranslationSettings();

					$currentProject.projectSettings.addedTranslations = [
						...$currentProject.projectSettings.addedTranslations,
						key
					];
				}
			}
		}

		$currentProject.timeline.subtitlesTracks[0].clips = subtitleClips; // Force l'update du component SubtitlesList
	}
</script>

<div
	class="flex w-full justify-start flex-wrap text-4xl xl:text-5xl arabic flex-row-reverse xl:leading-[5.4rem] leading-[4rem] py-10 my-auto px-6 overflow-y-auto xl:pb-20"
>
	{#each wordsInSelectedVerse as word, index}
		{@const isHighlighted = index >= startWordIndex && index <= endWordIndex}
		<button
			on:click={(e) => handleWordClicked(e, index, isHighlighted)}
			class={'px-1.5 flex flex-col outline-none text-center ' +
				(isHighlighted ? 'bg-[#fbff0027] hover:bg-[#5f5b20e1] ' : 'hover:bg-[#ffffff2f] ') +
				(selectedTextId ? 'w-full' : '')}
			><span class="text-center w-full">{word}</span>

			{#if !selectedTextId}
				{#if wbwTranslation[index] && $showWordByWordTranslation}
					<span class="text-sm w-full text-center molengo" style="margin-right: 0.5rem;"
						>{wbwTranslation[index]}</span
					>
				{/if}
				{#if wbwTransliteration[index] && $showWordByWordTransliteration}
					<span class="text-sm w-full text-center molengo" style="margin-right: 0.5rem;"
						>{wbwTransliteration[index]}</span
					>
				{/if}
			{/if}
		</button>
	{/each}
</div>

<script lang="ts">
	import Id from '$lib/ext/Id';
	import { currentProject } from '$lib/stores/ProjectStore';
	import { Mushaf, getNumberOfVerses, getVerse } from '$lib/stores/QuranStore';
	import { cursorPosition } from '$lib/stores/TimelineStore';
	import { onDestroy, onMount } from 'svelte';
	import toast from 'svelte-french-toast';

	export let verseNumber: number;
	export let surahNumber: number;

	// Split the verse into words
	$: wordsInSelectedVerse = getVerse(surahNumber, verseNumber).text.split(' ');

	$: if (verseNumber || surahNumber) {
		// Select the first word by default when the verse changes
		startWordIndex = 0;
		endWordIndex = 0;
	}

	// Select the words between startWordIndex and endWordIndex
	let startWordIndex = 0;
	let endWordIndex = 0;

	onMount(() => {
		// Le met sur le document car le window.onkeydown est déjà pris dans +layout.svelte
		window.document.onkeydown = onKeyDown;
	});

	onDestroy(() => {
		window.document.onkeydown = null;
	});

	/**
	 * Sélectionne le mot suivant
	 * Ou, s'il n'y a plus de mots, passe au verset suivant
	 * @param removeAllSection Si vrai, supprime la sélection actuelle pour ne sélectionner que le prochain mot
	 */
	function selectNextWord(removeAllSection: boolean = false) {
		// Dans le cas où on veut avancer le curseur (plusieurs mots sélectionnés)
		if (endWordIndex < wordsInSelectedVerse.length - 1) {
			endWordIndex += 1;

			if (removeAllSection) startWordIndex = endWordIndex;
		} else {
			// Verset suivant s'il existe
			if (verseNumber < getNumberOfVerses(surahNumber)) {
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
	function handleWordClicked(index: number, isHighlighted: boolean): any {
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
	}

	/**
	 * Gère les événements de touche clavier
	 * @param event Événement de touche clavier
	 */
	function onKeyDown(event: KeyboardEvent) {
		if (event.key === 'ArrowUp') {
			selectNextWord();
		} else if (event.key === 'ArrowDown') {
			selectPreviousWord();
		} else if (event.key === 'Enter') {
			const selectedWords = wordsInSelectedVerse.slice(startWordIndex, endWordIndex + 1).join(' ');
			addSubtitle(selectedWords);
			selectNextWord(true);
		} else if (event.key === 'b') {
			// Ajoute la basmallah
			addSubtitle('بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ');
		} else if (event.key === 'a') {
			// Ajoute la protection
			addSubtitle('أَعُوذُ بِاللَّهِ مِنَ الشَّيْطَانِ الرَّجِيمِ');
		} else if (event.key === 's' && !event.ctrlKey) {
			// Ajoute un silence
			addSubtitle('');
		} else if (event.key === 'a') {
			// Ajoute la protection
			addSubtitle('أَعُوذُ بِاللَّهِ مِنَ الشَّيْطَانِ الرَّجِيمِ');
		} else if (event.key === 'Backspace') {
			removeLastSubtitle();
		}
	}

	/**
	 * Supprime le dernier sous-titre
	 */
	function removeLastSubtitle() {
		let subtitleClips = $currentProject.timeline.subtitlesTracks[0].clips;

		if (subtitleClips.length > 0) {
			subtitleClips.pop();
		}

		$currentProject.timeline.subtitlesTracks[0].clips = subtitleClips;
	}

	function addSubtitle(subtitleText: string) {
		// Ajoute le sous-titre à la liste des sous-titres
		let subtitleClips = $currentProject.timeline.subtitlesTracks[0].clips;

		let lastSubtitleEndTime =
			subtitleClips.length > 0 ? subtitleClips[subtitleClips.length - 1].end : 0;

		// Vérifie qu'on est pas au 0
		if ($cursorPosition < 100) {
			toast.error('Jouer la vidéo pour ajouter un sous-titre');
			return;
		}
		// Vérifie que la fin > début
		// TODO 2
		if (lastSubtitleEndTime >= $cursorPosition) {
			toast.error(
				'La fin du sous-titre précédent est supérieure ou égale au début du nouveau sous-titre'
			);
			return;
		}

		subtitleClips.push({
			id: Id.generate(),
			start: lastSubtitleEndTime,
			end: $cursorPosition,
			text: subtitleText
		});

		// Met à jour la liste des sous-titres
		$currentProject.timeline.subtitlesTracks[0].clips = subtitleClips;
	}
</script>

<div
	class="flex w-full justify-start flex-wrap text-4xl xl:text-5xl arabic flex-row-reverse xl:leading-[5.4rem] leading-[4rem] py-10 my-auto px-6 overflow-y-auto xl:pb-20"
>
	{#each wordsInSelectedVerse as word, index}
		{@const isHighlighted = index >= startWordIndex && index <= endWordIndex}
		<button
			on:click={() => handleWordClicked(index, isHighlighted)}
			class={'px-1.5 ' +
				(isHighlighted ? 'bg-[#fbff0027] hover:bg-[#5f5b20e1]' : 'hover:bg-[#ffffff2f]')}
			>{word}</button
		>
	{/each}
</div>

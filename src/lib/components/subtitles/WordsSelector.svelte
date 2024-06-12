<script lang="ts">
	import { Mushaf, getNumberOfVerses, getVerse } from '$lib/stores/QuranStore';
	import { onDestroy, onMount } from 'svelte';

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
		window.onkeydown = onKeyDown;
	});

	function onKeyDown(event: KeyboardEvent) {
		if (event.key === 'ArrowUp') {
			event.preventDefault();
			// Dans le cas où on veut avancer le curseur (plusieurs mots sélectionnés)
			if (endWordIndex < wordsInSelectedVerse.length - 1) {
				endWordIndex += 1;
			} else {
				// Verset suivant s'il existe
				if (verseNumber < getNumberOfVerses(surahNumber)) {
					verseNumber += 1;
				}
			}
		}

		if (event.key === 'ArrowDown') {
			event.preventDefault();
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
	}
</script>

<div
	class="flex w-full justify-start flex-wrap text-4xl xl:text-5xl arabic flex-row-reverse xl:leading-[5.4rem] leading-[4rem] py-10 my-auto px-6 overflow-y-auto xl:pb-20"
>
	{#each wordsInSelectedVerse as word, index}
		{@const isHighlighted = index >= startWordIndex && index <= endWordIndex}
		<span
			class={'px-1.5 cursor-pointer ' +
				(isHighlighted ? 'bg-[#fbff0027] hover:bg-[#5f5b2049]' : 'hover:bg-[#ffffff2f]')}
			>{word}</span
		>
	{/each}
</div>

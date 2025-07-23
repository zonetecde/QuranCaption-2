<script lang="ts">
	import { Quran, type Verse } from '$lib/classes/Quran';
	import { globalState } from '$lib/runes/main.svelte';
	import VersePicker from './VersePicker.svelte';
	import WordsSelector from './WordsSelector.svelte';

	let selectedSurahNumber = $state(1); // Default to Surah Al-Fatiha
	let selectedVerseNumber = $state(1); // Default to verse 1

	let wordsSelector: WordsSelector;

	let selectedVerse = $derived(
		async () => await Quran.getVerse(selectedSurahNumber, selectedVerseNumber)
	);

	$effect(() => {
		selectedVerseNumber;
		selectedSurahNumber;

		// Lorsqu'on change de sourate, on réinitialise les index de sélection des mots
		wordsSelector.resetFirstAndLastWordIndex();
	});

	function goNextVerse() {
		if (selectedVerseNumber < Quran.getVerseCount(selectedSurahNumber)) {
			selectedVerseNumber += 1;
		}
	}

	function goPreviousVerse() {
		if (selectedVerseNumber > 1) {
			selectedVerseNumber -= 1;
		}
	}
</script>

<section
	class="overflow-hidden min-h-0 bg-[#0d0d0d]"
	style="height: {globalState.currentProject!.projectEditorState.upperSectionHeight}%;"
>
	<div class="w-full h-full border-t-2 border-color py-1 px-1.5">
		<!-- Sélecteur de verset -->
		<VersePicker bind:selectedSurahNumber bind:selectedVerseNumber />

		<!-- Affichage des mots du verset -->
		<WordsSelector
			bind:this={wordsSelector}
			{selectedVerse}
			{goNextVerse}
			{goPreviousVerse}
			getSurahNumber={() => selectedSurahNumber}
		/>
	</div>
</section>

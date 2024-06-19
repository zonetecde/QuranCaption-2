<script lang="ts">
	import { Mushaf } from '$lib/stores/QuranStore';
	import VersePicker from './VersePicker.svelte';
	import WordsSelector from './WordsSelector.svelte';

	let verseNumber = 1;
	let surahNumber = 1;

	let verseNumberInInput = 1;
	$: if (verseNumber) {
		// Lorsque le numéro de verset est changé dans `WordsSelector`, on le met à jour dans le picker
		verseNumberInInput = verseNumber;
	}
</script>

<div class="bg-black w-full h-full bg-opacity-40 overflow-y-auto flex flex-col">
	<VersePicker bind:verseNumber bind:surahNumber bind:verseNumberInInput />

	<WordsSelector bind:verseNumber bind:surahNumber />
</div>

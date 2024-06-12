<script lang="ts">
	import { Mushaf } from '$lib/stores/QuranStore';
	import VersePicker from './VersePicker.svelte';
	import WordsSelector from './WordsSelector.svelte';

	let verseNumber = 1;
	let surahNumber = 1;
</script>

<div class="bg-black w-full h-full bg-opacity-40 overflow-y-auto flex flex-col">
	<VersePicker bind:verseNumber bind:surahNumber />

	<WordsSelector {verseNumber} {surahNumber} />
</div>

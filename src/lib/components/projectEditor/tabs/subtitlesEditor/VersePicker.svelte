<script lang="ts">
	import { Quran, type Verse } from '$lib/classes/Quran';
	import { globalState } from '$lib/runes/main.svelte';
	import AutocompleteInput from '$lib/components/misc/AutocompleteInput.svelte';

	let subtitlesEditorState = $derived(() => globalState.getSubtitlesEditorState);

	// Create suggestions array for autocomplete
	let surahSuggestions = $derived(() => {
		return Quran.getSurahsNames().map((surah) => `${surah.id}. ${surah.transliteration}`);
	});

	// Current search value for surah
	let surahSearchValue = $state('');

	// Get current surah name for display
	let currentSurahName = $derived(() => {
		const surahId = globalState.getSubtitlesEditorState.selectedSurah;
		const surah = Quran.getSurahsNames().find((s) => s.id === surahId);
		return surah ? `${surah.id}. ${surah.transliteration}` : '';
	});

	// Update search value when current surah changes
	$effect(() => {
		surahSearchValue = currentSurahName();
	});

	function handleSurahSelection(selectedValue: string) {
		// Extract ID from the selected value (format: "1. Al-Fatihah")
		const match = selectedValue.match(/^(\d+)\./);
		if (match) {
			const surahId = parseInt(match[1]);
			globalState.getSubtitlesEditorState.selectedSurah = surahId;
			subtitlesEditorState().selectedVerse = 1;
			subtitlesEditorState().startWordIndex = 0;
			subtitlesEditorState().endWordIndex = 0;
		}
	}

	// Watch for changes in search value to update selection
	$effect(() => {
		if (surahSearchValue && surahSearchValue !== currentSurahName()) {
			handleSurahSelection(surahSearchValue);
		}
	});
</script>

<section
	class="w-full flex justify-end gap-3 items-center px-3 bg-secondary border border-color rounded-lg py-2"
>
	<!-- Surah Selector with Autocomplete -->
	<div class="flex items-center gap-2">
		<span class="text-sm font-medium text-secondary">Surah:</span>
		<div class="min-w-[200px]">
			<AutocompleteInput
				showEverything
				clearOnFocus
				bind:value={surahSearchValue}
				suggestions={surahSuggestions()}
				placeholder="Search surah"
				icon=""
			/>
		</div>
	</div>

	<!-- Separator -->
	<div class="flex items-center">
		<span class="text-lg font-bold text-accent mx-2">:</span>
	</div>

	<!-- Verse Selector -->
	<div class="flex items-center gap-2">
		<span class="text-sm font-medium text-secondary">Verse:</span>
		<input
			type="number"
			min="1"
			placeholder="1"
			class="bg-accent border border-color text-primary rounded-lg px-3 py-2 text-sm font-medium text-center w-20"
			max={Quran.getVerseCount(subtitlesEditorState().selectedSurah)}
			onchange={() => {
				subtitlesEditorState().startWordIndex = 0;
				subtitlesEditorState().endWordIndex = 0;
			}}
			bind:value={globalState.getSubtitlesEditorState.selectedVerse}
		/>
	</div>
</section>

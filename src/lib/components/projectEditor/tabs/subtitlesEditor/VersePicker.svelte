<script lang="ts">
	import { Quran, type Verse } from '$lib/classes/Quran';
	import { globalState } from '$lib/runes/main.svelte';

	let subtitlesEditorState = $derived(
		() => globalState.currentProject!.projectEditorState.subtitlesEditor
	);
</script>

<section class="w-full h-10 flex justify-end gap-x-2 items-center">
	<!-- un dropdown pour la sourate, est un input nombre pour le verset -->
	<select
		class="border border-color bg-accent rounded-md ring-0 h-9 py-0 text-base"
		bind:value={globalState.currentProject!.projectEditorState.subtitlesEditor.selectedSurah}
		onchange={() => {
			subtitlesEditorState().selectedVerse = 1; // Reset verse to 1 when surah changes
			subtitlesEditorState().startWordIndex = 0; // Reset start word index
			subtitlesEditorState().endWordIndex = 0; // Reset end word index
		}}
	>
		{#each Quran.getSurahsNames() as surahName}
			<option value={surahName.id}>{surahName.id}. {surahName.transliteration}</option>
		{/each}
	</select>

	<span>:</span>
	<input
		type="number"
		min="1"
		placeholder="Verse"
		class="border border-color bg-accent rounded-md ring-0 w-[80px] h-9 py-0"
		max={Quran.getVerseCount(subtitlesEditorState().selectedSurah)}
		bind:value={globalState.currentProject!.projectEditorState.subtitlesEditor.selectedVerse}
	/>
</section>

<script lang="ts">
	import { Quran, type Verse } from '$lib/classes/Quran';
	import { globalState } from '$lib/runes/main.svelte';

	let subtitlesEditorState = $derived(
		() => globalState.currentProject!.projectEditorState.subtitlesEditor
	);
</script>

<section
	class="w-full h-12 flex justify-end gap-3 items-center px-3 bg-secondary border border-color rounded-lg"
>
	<!-- Surah Selector -->
	<div class="flex items-center gap-2">
		<span class="text-sm font-medium text-secondary">Surah:</span>
		<select
			class="bg-accent border border-color text-primary rounded-lg px-3 py-2 text-sm font-medium
			       focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)] focus:border-transparent
			       hover:border-[var(--accent-primary)] transition-all duration-200 min-w-[200px]"
			bind:value={globalState.currentProject!.projectEditorState.subtitlesEditor.selectedSurah}
			onchange={() => {
				subtitlesEditorState().selectedVerse = 1; // Reset verse to 1 when surah changes
				subtitlesEditorState().startWordIndex = 0; // Reset start word index
				subtitlesEditorState().endWordIndex = 0; // Reset end word index
			}}
		>
			{#each Quran.getSurahsNames() as surahName}
				<option value={surahName.id} class="bg-accent text-primary">
					{surahName.id}. {surahName.transliteration}
				</option>
			{/each}
		</select>
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
			class="bg-accent border border-color text-primary rounded-lg px-3 py-2 text-sm font-medium text-center
			       focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)] focus:border-transparent
			       hover:border-[var(--accent-primary)] transition-all duration-200 w-20"
			max={Quran.getVerseCount(subtitlesEditorState().selectedSurah)}
			onchange={() => {
				subtitlesEditorState().startWordIndex = 0;
				subtitlesEditorState().endWordIndex = 0;
			}}
			bind:value={globalState.currentProject!.projectEditorState.subtitlesEditor.selectedVerse}
		/>
	</div>
</section>

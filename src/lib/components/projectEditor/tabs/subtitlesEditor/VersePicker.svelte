<script lang="ts">
	import { Quran, type Verse } from '$lib/classes/Quran';
	import { globalState } from '$lib/runes/main.svelte';

	let { selectedSurahNumber = $bindable(), selectedVerseNumber = $bindable() } = $props();

	$effect(() => {
		if (selectedSurahNumber) {
			selectedVerseNumber = 1; // Reset verse when surah changes
		}
	});
</script>

<section class="w-full h-10 flex justify-end gap-x-2 items-center">
	<!-- un dropdown pour la sourate, est un input nombre pour le verset -->
	<select
		class="border border-color bg-accent rounded-md ring-0 h-9 py-0 text-base"
		bind:value={selectedSurahNumber}
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
		max={Quran.getVerseCount(selectedSurahNumber)}
		bind:value={selectedVerseNumber}
	/>
</section>

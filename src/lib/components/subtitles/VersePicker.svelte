<script lang="ts">
	import { currentProject } from '$lib/stores/ProjectStore';
	import { Mushaf } from '$lib/stores/QuranStore';
	import { onMount } from 'svelte';

	export let verseNumberInInput = 1;
	export let verseNumber = 1;
	export let surahNumber = 1;

	$: if (
		verseNumberInInput >= 1 &&
		verseNumberInInput <= $Mushaf.surahs[surahNumber - 1].verses.length
	) {
		verseNumber = verseNumberInInput;
	}

	onMount(() => {
		// Remets là où on était
		const lastSubtitle = $currentProject.timeline.subtitlesTracks[0].clips.slice(-1)[0];
		if (lastSubtitle) {
			verseNumber = lastSubtitle.verse;
			verseNumberInInput = lastSubtitle.surah;
			surahNumber = lastSubtitle.surah;
		}
	});

	function onSurahChange(event: any) {
		verseNumber = 1;
		verseNumberInInput = 1;
		surahNumber = parseInt(event.target.value);
	}
</script>

<section id="navig" class="w-full h-8 flex flex-row mt-1.5 pr-1.5">
	<select
		class="bg-white bg-opacity-15 w-[200px] ml-auto ox-2 outline-none"
		on:change={onSurahChange}
	>
		{#each $Mushaf.surahs as surah}
			<option class="bg-gray-800" selected={surah.id === surahNumber} value={surah.id}
				>{surah.id}. {surah.transliteration}</option
			>
		{/each}
	</select>
	<p class="mx-2 mt-1">:</p>
	<input
		type="number"
		class="bg-white bg-opacity-15 w-[65px] px-2 outline-none"
		min="1"
		max={$Mushaf.surahs[surahNumber - 1].total_verses}
		bind:value={verseNumberInInput}
	/>
</section>

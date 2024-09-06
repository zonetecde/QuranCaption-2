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
		for (let i = $currentProject.timeline.subtitlesTracks[0].clips.length; i >= 0; i--) {
			const element = $currentProject.timeline.subtitlesTracks[0].clips[i];

			if (element && element.verse !== -1 && element.surah !== -1) {
				verseNumber = element.verse;
				verseNumberInInput = element.verse;
				surahNumber = element.surah;

				if (element.isLastWordInVerse) {
					// Go to next verse
					verseNumber += 1;
					verseNumberInInput += 1;
				}
				break;
			}
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

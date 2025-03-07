<script lang="ts">
	import { milisecondsToMMSS, type SubtitleClip } from '$lib/models/Timeline';
	import { currentProject } from '$lib/stores/ProjectStore';
	import { getEditionFromName } from '$lib/stores/QuranStore';
	import { onMount } from 'svelte';

	import TranslationsCreatorHeader from './TranslationsCreatorHeader.svelte';
	import { downloadTranslationForVerse } from '$lib/stores/QuranStore';
	import TranslationInput from './TranslationInput.svelte';

	function isSameVerseThanPreviousSubtitle(subtitleIndex: number): boolean {
		let track = $currentProject.timeline.subtitlesTracks[0];

		if (subtitleIndex === 0) return false;

		let i: number = 1;
		// ne compte pas les silences/subtitles speciaux
		while (track.clips[subtitleIndex - i].verse === -1) {
			i++;

			if (subtitleIndex - i < 0) return false;
		}

		return (
			track.clips[subtitleIndex - i].verse === track.clips[subtitleIndex].verse &&
			track.clips[subtitleIndex - i].surah === track.clips[subtitleIndex].surah
		);
	}
</script>

<div class="bg-[#0f0f0f] w-full h-full flex flex-col">
	<TranslationsCreatorHeader />

	<div class="mt-0 flex flex-grow flex-col py-4 bg-[#1f1f1f]">
		{#each $currentProject.timeline.subtitlesTracks[0].clips as subtitle, i}
			{#if !subtitle.isSilence}
				<!-- ajout dune separation -->
				{#if !isSameVerseThanPreviousSubtitle(i) && i !== 0}
					<div class="h-1 w-full bg-[#7e6d77]"></div>
				{/if}
				<TranslationInput bind:subtitle subtitleIndex={i} />
			{/if}
		{/each}
	</div>
</div>

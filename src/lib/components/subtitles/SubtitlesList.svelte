<script lang="ts">
	import { milisecondsToMMSS, type SubtitleClip } from '$lib/models/Timeline';
	import {
		clearSubtitleToEdit,
		currentlyCustomizedSubtitleId,
		currentlyEditedSubtitleId,
		currentPage,
		setCurrentVideoTime,
		setSubtitleToEdit
	} from '$lib/stores/LayoutStore';
	import { currentProject } from '$lib/stores/ProjectStore';
	import { getEditionFromName } from '$lib/stores/QuranStore';
	import { cursorPosition, scrollToCursor } from '$lib/stores/TimelineStore';
	import { isPreviewPlaying } from '$lib/stores/VideoPreviewStore';
	import SubtitlesListItem from './SubtitlesListItem.svelte';

	let div: HTMLDivElement;

	$: if ($currentProject.timeline.subtitlesTracks[0].clips && div) {
		// Scroll to the bottom of the div
		div.scrollTop = div.scrollHeight;
	}
</script>

<div
	class="h-full w-full bg-[#1f1f1f] overflow-y-scroll"
	bind:this={div}
	id="subtitle-list-container"
>
	{#each $currentProject.timeline.subtitlesTracks[0].clips as subtitle}
		<SubtitlesListItem {subtitle} />
	{/each}
</div>

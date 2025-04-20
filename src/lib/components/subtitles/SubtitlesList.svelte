<script lang="ts">
	import { currentProject } from '$lib/stores/ProjectStore';
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

<script lang="ts">
	import VideoTrack from './track/VideoTrack.svelte';
	import { currentProject } from '$lib/stores/ProjectStore';
</script>

<div class="w-full h-full bg-[#1f1d1d] overflow-y-auto">
	{#each $currentProject.timeline.subtitlesTracks as track}
		<div class="w-full h-10"></div>
	{/each}
	{#each $currentProject.timeline.videosTracks as track}
		<VideoTrack bind:track />
	{/each}
	{#each $currentProject.timeline.audiosTracks as track}
		<div class="w-full h-10"></div>
	{/each}
</div>

<script lang="ts">
	import { timeline } from '$lib/stores/TimelineStore';
	import { onMount } from 'svelte';
	import VideoTrack from './track/VideoTrack.svelte';

	onMount(() => {
		console.log($timeline.audiosTracks);
	});
</script>

<div class="w-full h-full bg-[#1f1d1d] overflow-y-auto">
	{#each $timeline.subtitlesTracks as track}
		<div class="w-full h-10"></div>
	{/each}
	{#each $timeline.videosTracks as track}
		<VideoTrack bind:track />
	{/each}
	{#each $timeline.audiosTracks as track}
		<div class="w-full h-10"></div>
	{/each}
</div>

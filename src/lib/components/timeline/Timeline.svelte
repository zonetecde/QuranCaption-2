<script lang="ts">
	import VideoTrack from './track/VideoTrack.svelte';
	import { currentProject } from '$lib/stores/ProjectStore';
	import { zoom } from '$lib/stores/TimelineStore';
	import { onMount } from 'svelte';
	import LeftPart from './track/LeftPart.svelte';

	onMount(() => {});
</script>

<div class="w-full h-full bg-[#1f1d1d] overflow-x-scroll relative">
	<div class="w-24 lg:w-40 h-full bg-[#0e0e0e] border-r-2 border-[#1d1b1b] absolute"></div>

	<div class="absolute top-0 left-24 lg:left-40 h-full flex">
		{#each Array.from({ length: 100 }, (_, i) => i) as i}
			<div
				class="h-full"
				style="width: {$zoom}px; background-color:  {i % 2 === 0 ? '#1a1d1d' : '#1d1d1d'}
			"
			>
				<p class="text-xs opacity-30">{i}</p>
			</div>
		{/each}
	</div>

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

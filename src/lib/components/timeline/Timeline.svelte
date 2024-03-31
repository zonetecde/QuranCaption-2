<script lang="ts">
	import VideoTrack from './track/VideoTrack.svelte';
	import { currentProject } from '$lib/stores/ProjectStore';
	import { zoom } from '$lib/stores/TimelineStore';
	import { onMount } from 'svelte';
	import LeftPart from './track/LeftPart.svelte';
	import { secondsToMMSS } from '$lib/classes/Timeline';

	onMount(() => {});
</script>

<div class="overflow-scroll h-full">
	<div class="h-full bg-[#1f1d1d] relative w-max">
		<div class="pl-24 lg:pl-40 h-full flex w-full">
			{#each Array.from({ length: 110 }, (_, i) => i) as i}
				<div
					class="h-full"
					style="min-width: {$zoom}px; background-color:  {i % 2 === 0 ? '#1a1d1d' : '#1d1d1d'};
					"
				>
					<p class="text-[0.6rem] opacity-30">{secondsToMMSS(i)}</p>
				</div>
			{/each}
		</div>

		<div class="absolute top-0 left-0 w-full h-full">
			<LeftPart />

			<div class="absolute left-0 top-0 w-full">
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
		</div>
	</div>
</div>

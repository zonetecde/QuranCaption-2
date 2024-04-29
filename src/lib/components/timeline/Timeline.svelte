<script lang="ts">
	import TrackComponent from './track/VideoTrack.svelte';
	import { currentProject } from '$lib/stores/ProjectStore';
	import { getTimelineTotalDuration, zoom } from '$lib/stores/TimelineStore';
	import { onMount } from 'svelte';
	import LeftPart from './track/LeftPart.svelte';
	import { secondsToMMSS } from '$lib/classes/Timeline';
	import { isCtrlPressed } from '$lib/stores/ShortcutStore';

	$: timeLineTotalDuration = getTimelineTotalDuration($currentProject.timeline);

	function handleMouseWheelWheeling(event: WheelEvent) {
		if (!$isCtrlPressed) return;

		if (event.deltaY > 0 && $zoom > 0.2) {
			zoom.update((value) => (value - 1 > 0 ? value - 0.75 : value - 0.1));
		} else if ($zoom < 100) {
			zoom.update((value) => (value >= 1 ? value + 0.75 : value + 0.1));
		}
	}
</script>

<div class="overflow-scroll h-full" on:wheel={handleMouseWheelWheeling}>
	<div class="h-full bg-[#1f1d1d] relative w-max">
		<div class="pl-24 lg:pl-40 h-full flex w-full">
			{#each Array.from({ length: timeLineTotalDuration }, (_, i) => i) as i}
				<div
					class="h-full"
					style="min-width: {$zoom}px; max-width: {$zoom}px; background-color:  {i % 2 === 0
						? '#1a1d1d'
						: '#1d1d1d'};
					"
				>
					{#if $zoom > 16 || ($zoom < 16 && $zoom > 12 && i % 10 === 0) || ($zoom < 12 && i % 30 === 0)}
						<p class="text-[0.6rem] opacity-30 -translate-x-1/2 w-fit">
							{secondsToMMSS(i)}
						</p>
					{/if}
				</div>
			{/each}
		</div>

		<div class="absolute top-0 left-0 w-full h-full">
			<LeftPart />

			<div class="absolute left-0 top-0 w-full pt-5">
				{#each $currentProject.timeline.subtitlesTracks as track}
					<TrackComponent bind:track />
				{/each}
				{#each $currentProject.timeline.videosTracks as track}
					<TrackComponent bind:track />
				{/each}
				{#each $currentProject.timeline.audiosTracks as track}
					<TrackComponent bind:track />
				{/each}
			</div>
		</div>
	</div>
</div>

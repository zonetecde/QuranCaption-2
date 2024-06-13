<script lang="ts">
	import TrackComponent from './track/TrackComponent.svelte';
	import { currentProject } from '$lib/stores/ProjectStore';
	import {
		cursorPosition,
		forceUpdateCurrentPlayingMedia,
		getTimelineTotalDuration,
		zoom
	} from '$lib/stores/TimelineStore';
	import { onMount } from 'svelte';
	import LeftPart from './track/LeftPart.svelte';
	import { secondsToHHMMSS } from '$lib/classes/Timeline';
	import { isCtrlPressed, spaceBarPressed } from '$lib/stores/ShortcutStore';
	import { isPreviewPlaying } from '$lib/stores/VideoPreviewStore';

	$: timeLineTotalDuration = getTimelineTotalDuration($currentProject.timeline);

	function handleMouseWheelWheeling(event: WheelEvent) {
		if (!$isCtrlPressed) return;

		if (event.deltaY > 0 && $zoom > 0.2) {
			zoom.update((value) => (value - 1 > 0 ? value - 0.75 : value - 0.1));
		} else if ($zoom < 100) {
			zoom.update((value) => (value >= 1 ? value + 0.75 : value + 0.1));
		}
	}

	function moveCursorToPosition(e: any, i: number) {
		let rect = e.currentTarget.getBoundingClientRect();
		const positionClickedWithin = e.clientX - rect.left;
		const totalSize = $zoom;
		const toAdd = (positionClickedWithin / totalSize) * 1000;

		// Pause la vidéo au cas où elle est en cours de lecture
		//isPreviewPlaying.set(false);

		cursorPosition.set((e.clientX - rect.left) / $zoom + i * 1000 + toAdd);

		// Permet de forcer la mise à jour du clip en cours de lecture
		setTimeout(() => {
			forceUpdateCurrentPlayingMedia.set(true);
		}, 0);
	}
</script>

<div class="overflow-x-scroll h-full" on:wheel={handleMouseWheelWheeling}>
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
					{#if $zoom >= 30 || ($zoom > 20 && i % 5 === 0 && $zoom < 30) || ($zoom > 10 && i % 3 === 0 && $zoom < 20) || ($zoom > 5 && i % 5 === 0 && $zoom < 10) || ($zoom > 3 && i % 10 === 0 && $zoom < 5) || ($zoom > 1.5 && i % 20 === 0 && $zoom < 3) || ($zoom > 1 && i % 50 === 0 && $zoom < 1.5)}
						<p class="text-[0.6rem] opacity-30 -translate-x-1/2 w-fit">
							{secondsToHHMMSS(i, true)[0]}
						</p>
					{/if}

					<!-- svelte-ignore a11y-mouse-events-have-key-events -->
					<button
						class="w-full h-6 absolute top-0 z-10 select-none"
						on:click={(e) => moveCursorToPosition(e, i)}
						on:mousemove={(e) => {
							if (e.buttons !== 1) return;
							moveCursorToPosition(e, i);
						}}
					></button>
				</div>
			{/each}

			<!-- Cursor -->
			<!-- The `- 1` in the calcul is because the cursor is 2px thick -->
			<div
				class="absolute top-0 left-24 lg:left-40 h-full w-0.5 bg-[#fd322b] z-20"
				style="transform: translateX({($cursorPosition / 1000) * $zoom - 1}px);"
			></div>
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

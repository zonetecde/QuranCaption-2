<script lang="ts">
	import TrackComponent from './track/TrackComponent.svelte';
	import { currentProject } from '$lib/stores/ProjectStore';
	import {
		cursorPosition,
		forceUpdateCurrentPlayingMedia,
		getTimelineTotalDuration,
		getVideoDurationInMs,
		scrollPosition,
		zoom
	} from '$lib/stores/TimelineStore';
	import { onMount } from 'svelte';
	import LeftPart from './track/LeftPart.svelte';
	import { secondsToHHMMSS } from '$lib/models/Timeline';
	import { isCtrlPressed, spaceBarPressed } from '$lib/stores/ShortcutStore';
	import {
		bestPerformance,
		currentPage,
		fullScreenPreview,
		setCurrentVideoTime
	} from '$lib/stores/LayoutStore';
	import { isPreviewPlaying } from '$lib/stores/VideoPreviewStore';
	import { startTime, endTime, exportType } from '$lib/stores/ExportStore';

	export let useInPlayer = false; // Est-ce que c'est utilisé en tant que barrre de temps dans le lecteur vidéo ?
	export let hideVerticalScrollBar = false; // Est-ce que la barre de défilement verticale doit être masquée ?

	onMount(() => {
		const timeline = document.getElementById('timeline');
		timeline?.scrollTo($scrollPosition, 0);
	});

	$: timeLineTotalDuration = getTimelineTotalDuration();

	function handleMouseWheelWheeling(event: WheelEvent) {
		if (!$isCtrlPressed) return;

		if (event.deltaY > 0 && $zoom > 0.2) {
			zoom.update((value) => (value - 1 > 0 ? value - 0.75 : value - 0.1));
		} else if ($zoom < 100) {
			zoom.update((value) => (value >= 1 ? value + 0.75 : value + 0.1));
		}

		if ($zoom === 10) {
			// Valeur interdite qui fait beuguer le rendu
			$zoom = 10.01;
		}
	}

	function calculateCursorPositionFromMouse(mouseXrelative: number) {
		const newCursorPosition = (mouseXrelative / $zoom) * 1000;

		// Enlève temporairement l'effet de fade (car on ne veut pas que le fade soit visible lors du déplacement du curseur, juste
		// lors de la lecture)
		const temp = $currentProject.projectSettings.globalSubtitlesSettings.fadeDuration;
		if (temp !== 0) {
			$currentProject.projectSettings.globalSubtitlesSettings.fadeDuration = 0;
			setTimeout(() => {
				$currentProject.projectSettings.globalSubtitlesSettings.fadeDuration = temp;
			}, 0);
		}

		cursorPosition.set(newCursorPosition);
		setCurrentVideoTime.set(newCursorPosition);

		// Permet de forcer la mise à jour du clip en cours de lecture
		setTimeout(() => {
			forceUpdateCurrentPlayingMedia.set(true);
		}, 0);
	}
</script>

<div
	class={'overflow-x-scroll h-full ' +
		(useInPlayer
			? 'overflow-y-hidden flipped '
			: ' ' + (hideVerticalScrollBar ? 'overflow-y-hidden' : ''))}
	on:scroll={(e) => {
		scrollPosition.set(e.currentTarget.scrollLeft);
	}}
	id="timeline"
	on:wheel={handleMouseWheelWheeling}
>
	<div class={'h-full bg-[#1f1d1d] relative w-max ' + (useInPlayer ? 'content' : '')}>
		<div class="pl-24 lg:pl-40 h-full relative">
			{#if !$bestPerformance}
				<div class="relative" style="width: {timeLineTotalDuration * $zoom}px; height: 100%;">
					<!-- Background Layer -->
					<div
						class="absolute top-0 left-0 h-full w-full"
						style={`background: repeating-linear-gradient(
									90deg,
									#1a1e1d,
									#1a1e1d ${$zoom}px,
									#1d1d1d ${$zoom}px,
									#1d1d1d ${$zoom * 2}px
								);
								z-index: 1;`}
					></div>
					<!-- Time Markers Layer -->
					<div class="absolute top-0 left-0 h-6 w-full" style="z-index: 2;">
						{#each Array.from({ length: timeLineTotalDuration }, (_, i) => i) as i}
							{#if $zoom >= 30 || ($zoom > 20 && i % 5 === 0 && $zoom < 30) || ($zoom > 10 && i % 3 === 0 && $zoom < 20) || ($zoom > 5 && i % 5 === 0 && $zoom < 10) || ($zoom > 3 && i % 10 === 0 && $zoom < 5) || ($zoom > 1.5 && i % 20 === 0 && $zoom < 3) || ($zoom > 1 && i % 50 === 0 && $zoom < 1.5)}
								<p
									class="text-[0.6rem] opacity-30 absolute -translate-x-1/2 w-fit"
									style="left: {i * $zoom + $zoom / 2}px; top: 0;"
								>
									{secondsToHHMMSS(i, true)[0]}
								</p>
							{/if}
						{/each}
					</div>
					<!-- Clickable Interaction Layer -->
					<!-- svelte-ignore a11y-no-static-element-interactions -->
					<div
						class="absolute top-0 left-0 w-full h-6 select-none outline-none cursor-pointer"
						style="z-index: 10;"
						tabindex="-1"
						on:mousedown={(e) => {
							let rect = e.currentTarget.getBoundingClientRect();
							calculateCursorPositionFromMouse(e.clientX - rect.left);
						}}
						on:mousemove={(e) => {
							if (e.buttons !== 1 || $isPreviewPlaying) return;
							let rect = e.currentTarget.getBoundingClientRect();
							calculateCursorPositionFromMouse(e.clientX - rect.left);
						}}
					></div>
				</div>
			{:else}
				<div class="relative" style="width: {timeLineTotalDuration * $zoom}px; height: 100%;">
					<!-- svelte-ignore a11y-no-static-element-interactions -->
					<div
						class="absolute top-0 left-0 h-4 w-full select-none outline-none cursor-pointer"
						style="z-index: 10;"
						tabindex="-1"
						on:mousedown={(e) => {
							let rect = e.currentTarget.getBoundingClientRect();
							calculateCursorPositionFromMouse(e.clientX - rect.left);
						}}
						on:mousemove={(e) => {
							if (e.buttons !== 1 || $isPreviewPlaying) return;
							let rect = e.currentTarget.getBoundingClientRect();
							calculateCursorPositionFromMouse(e.clientX - rect.left);
						}}
					></div>
				</div>
			{/if}
			<!-- Cursor -->
			<!-- The `- 1` in the calcul is because the cursor is 2px thick -->
			<div
				class="absolute top-0 left-24 lg:left-40 h-full w-0.5 bg-[#fd322b] z-20"
				id="cursor"
				style="transform: translateX({($cursorPosition / 1000) * $zoom - 1}px);"
			></div>

			{#if $currentPage === 'Export' && !$fullScreenPreview && $exportType === 'video-static'}
				<!-- Selection area between start and end time -->
				{#if $startTime >= 0 && ($endTime || getVideoDurationInMs()) > $startTime}
					<div
						class="absolute top-5 left-24 lg:left-40 h-60 z-50"
						style="
						transform: translateX({($startTime / 1000) * $zoom}px);
						width: {((($endTime || getVideoDurationInMs()) - $startTime) / 1000) * $zoom}px;
						background-color: rgba(46, 204, 113, 0.3);
						border-top: 2px solid rgba(46, 204, 113, 0.5);
						border-bottom: 2px solid rgba(46, 204, 113, 0.5);
					"
					></div>
				{/if}

				<!-- Start time marker -->
				{#if $startTime > 0}
					<div
						class="absolute top-5 left-24 lg:left-40 h-60 z-50 flex items-center border-l-2 border-[#229753]"
						style="transform: translateX({($startTime / 1000) * $zoom}px);"
					></div>
				{/if}

				<!-- End time marker -->
				{#if ($endTime || getVideoDurationInMs()) > 0}
					<div
						class="absolute top-5 left-24 lg:left-40 h-60 z-50 flex items-center border-l-2 border-[#229753]"
						style="transform: translateX({(($endTime || getVideoDurationInMs()) / 1000) *
							$zoom}px);"
					></div>
				{/if}
			{/if}
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

<style>
	.flipped,
	.content {
		transform: rotateX(180deg);
		-ms-transform: rotateX(180deg); /* IE 9 */
		-webkit-transform: rotateX(180deg); /* Safari and Chrome */
	}
</style>

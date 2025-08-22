<script lang="ts">
	import { Duration } from '$lib/classes';
	import { globalState } from '$lib/runes/main.svelte';
	import { invoke } from '@tauri-apps/api/core';

	let {
		togglePlayPause
	}: {
		togglePlayPause: () => void;
	} = $props();

	let isPlaying = $derived(() => globalState.getVideoPreviewState.isPlaying);

	let videoDuration = $derived(() =>
		globalState.currentProject!.content.timeline.getLongestTrackDuration().getFormattedTime(false)
	);

	let currentDuration = $derived(() =>
		new Duration(globalState.getTimelineState.cursorPosition).getFormattedTime(false, true)
	);
</script>

<div class="bg-primary h-10 w-full flex items-center justify-center relative pt-0.25 rounded-t-xl">
	<!-- Timestamp dans la vidéo -->
	<section class="absolute left-3 monospaced">
		{currentDuration()} / {videoDuration()}
	</section>

	<!-- play/pause button with material icons -->
	<button
		class="flex items-center justify-center w-8 h-8 text-white hover:bg-gray-700 rounded-full transition-colors cursor-pointer duration-200"
		onclick={togglePlayPause}
	>
		<span class="material-icons text-xl pt-0.25">
			{isPlaying() ? 'pause' : 'play_arrow'}
		</span>
	</button>

	<!-- Toggle fullscreen -->
	<section class="absolute right-3">
		<div class="flex items-center gap-x-2">
			<p class="text-thirdly">Press F11 to toggle fullscreen</p>
			<button
				onclick={globalState.getVideoPreviewState.toggleFullScreen}
				class="flex items-center justify-center w-8 h-8 text-white hover:bg-gray-700 rounded-full transition-colors cursor-pointer duration-200"
			>
				<span class="material-icons text-xl pt-0.25">fullscreen</span>
			</button>
		</div>
	</section>
</div>

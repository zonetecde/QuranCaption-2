<script lang="ts">
	import { secondsToHHMMSS } from '$lib/classes/Timeline';
	import { getAssetFromId } from '$lib/ext/Id';
	import { currentProject } from '$lib/stores/ProjectStore';
	import { cursorPosition, getTimelineTotalDuration } from '$lib/stores/TimelineStore';
	import { convertFileSrc } from '@tauri-apps/api/tauri';

	let isPlaying = false;
	$: currentTime = secondsToHHMMSS($cursorPosition / 1000); // [0] = HH:MM:SS, [1] = milliseconds
	$: currentVideo = $currentProject.timeline.videosTracks[0].clips.find(
		(video) =>
			(video.start === 0 && video.start <= $cursorPosition && video.end >= $cursorPosition) ||
			(video.start > 0 && video.start - 1000 < $cursorPosition && video.end >= $cursorPosition)
	);

	let videoComponent: HTMLVideoElement;

	$: if ($cursorPosition) {
		if (!isPlaying && currentVideo && videoComponent) {
			// Update the video
			videoComponent.currentTime = ($cursorPosition - currentVideo.start) / 1000;
		}
	}

	function handlePlayVideoButtonClicked() {
		isPlaying = !isPlaying;

		setTimeout(() => {
			if (currentVideo && videoComponent) {
				if (isPlaying) {
					// Set the video components to play where the cursor position is
					videoComponent.currentTime = ($cursorPosition - currentVideo.start) / 1000;
					videoComponent.play();

					// While the video is playing, update the cursor position
					const interval = setInterval(() => {
						if (videoComponent && videoComponent.ended) {
							// Look if there's a video after this one in the timeline
							const nextVideo = $currentProject.timeline.videosTracks[0].clips.find(
								(video) => video.start > currentVideo.end
							);

							if (nextVideo) {
								cursorPosition.set(nextVideo.start);
							} else {
								isPlaying = false;
								clearInterval(interval);
							}
						} else if (videoComponent === null) {
							clearInterval(interval);
						} else {
							if (videoComponent.currentTime * 1000 + currentVideo.start >= currentVideo.end) {
								const nextVideo = $currentProject.timeline.videosTracks[0].clips.find(
									(video) => video.start > currentVideo.end
								);
							}

							cursorPosition.set(videoComponent.currentTime * 1000 + currentVideo.start);
						}
					}, 10);
				} else {
					videoComponent.pause();
				}
			}
		}, 10);
	}
</script>

<div class="w-full h-full flex flex-col relative">
	<div class="h-full relative bg-[#0f0d0d] pb-16">
		{#if isPlaying || !isPlaying}
			{#if currentVideo && currentVideo.assetId}
				{@const video = getAssetFromId(currentVideo.assetId)}
				{#if video}
					<video
						class="bg-red-black w-full h-full object-contain"
						src={convertFileSrc(video.filePath)}
						bind:this={videoComponent}
					>
						<track kind="captions" src="vtt" srclang="en" label="English" default />
					</video>
				{:else}
					<p>Video does not exist</p>
				{/if}
			{:else}{/if}
		{/if}
	</div>

	<section
		id="controles"
		class="absolute bottom-0 h-16 w-full bg-[#141616] border-t-2 border-[#363232]"
	>
		<div class="flex flex-row items-center justify-center h-full w-full relative">
			<p class="monospace text-lg absolute left-4 rounded-xl bg-[#110f0f] px-3 py-1">
				{currentTime[0]}<span class="text-xs">.{currentTime[1]}</span> / {secondsToHHMMSS(
					getTimelineTotalDuration($currentProject.timeline)
				)[0]}
			</p>

			<button class="bg-slate-950 w-10 p-1 rounded-full" on:click={handlePlayVideoButtonClicked}>
				{#if isPlaying}
					<svg
						xmlns="http://www.w3.org/2000/svg"
						fill="none"
						viewBox="0 0 24 24"
						stroke-width="1.5"
						stroke="currentColor"
					>
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							d="M15.75 5.25v13.5m-7.5-13.5v13.5"
						/>
					</svg>
				{:else}
					<svg
						xmlns="http://www.w3.org/2000/svg"
						fill="none"
						viewBox="0 0 24 24"
						stroke-width="1.5"
						stroke="currentColor"
						class="ml-0.5"
					>
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.347a1.125 1.125 0 0 1 0 1.972l-11.54 6.347a1.125 1.125 0 0 1-1.667-.986V5.653Z"
						/>
					</svg>
				{/if}
			</button>
		</div>
	</section>
</div>

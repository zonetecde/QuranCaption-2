<script lang="ts">
	import { secondsToHHMMSS } from '$lib/classes/Timeline';
	import { getAssetFromId } from '$lib/ext/Id';
	import { currentProject } from '$lib/stores/ProjectStore';
	import { spaceBarPressed } from '$lib/stores/ShortcutStore';
	import {
		cursorPosition,
		getLastClipEnd,
		getTimelineTotalDuration
	} from '$lib/stores/TimelineStore';
	import { convertFileSrc } from '@tauri-apps/api/tauri';

	let isPlaying = false;
	$: currentTime = secondsToHHMMSS($cursorPosition / 1000); // [0] = HH:MM:SS, [1] = milliseconds
	$: currentVideo = $currentProject.timeline.videosTracks[0].clips.find(
		(video) =>
			(video.start === 0 && video.start <= $cursorPosition && video.end >= $cursorPosition) ||
			(video.start > 0 && video.start - 1000 < $cursorPosition && video.end >= $cursorPosition)
	);
	$: currentAudio = $currentProject.timeline.audiosTracks[0].clips.find(
		(audio) =>
			(audio.start === 0 && audio.start <= $cursorPosition && audio.end >= $cursorPosition) ||
			(audio.start > 0 && audio.start - 1000 < $cursorPosition && audio.end >= $cursorPosition)
	);

	$: if ($spaceBarPressed) {
		handlePlayVideoButtonClicked();
		spaceBarPressed.set(false);
	}

	let videoComponent: HTMLVideoElement;
	let audioComponent: HTMLAudioElement;

	$: if ($cursorPosition) {
		if (!isPlaying && currentVideo && videoComponent) {
			// Update the video to the cursor position. When playing the video will start from the cursor position
			videoComponent.currentTime = ($cursorPosition - currentVideo.start) / 1000;
		}

		if (!isPlaying && currentAudio && audioComponent) {
			// Update the audio to the cursor position. When playing the audio will start from the cursor position
			audioComponent.currentTime = ($cursorPosition - currentAudio.start) / 1000;
		}
	}

	function handlePlayVideoButtonClicked() {
		isPlaying = !isPlaying;

		if (isPlaying) {
			playVideo();
		}
	}

	function playVideo() {
		const interval = setInterval(() => {
			if (isPlaying && (videoComponent || audioComponent)) {
				$cursorPosition += 10;
				// Play the video
				if (videoComponent) videoComponent.play();

				if (audioComponent) audioComponent.play();
			} else {
				// Pause the video
				if (currentVideo && videoComponent) videoComponent.pause();
				if (currentAudio && audioComponent) audioComponent.pause();

				clearInterval(interval);
			}
		}, 10);
	}
</script>

<div class="w-full h-full flex flex-col relative">
	<div class="h-full relative bg-[#0f0d0d] pb-16">
		{#if (currentVideo && currentVideo.assetId) || (currentAudio && currentAudio.assetId)}
			{#if currentVideo}
				{@const video = getAssetFromId(currentVideo.assetId)}
				{#if video}
					<video
						class="bg-red-black w-full h-full object-contain"
						src={convertFileSrc(video.filePath)}
						bind:this={videoComponent}
						muted={currentVideo.isMuted}
					>
						<track kind="captions" src="vtt" srclang="en" label="English" default />
					</video>
				{:else}
					<p>Video does not exist</p>
				{/if}
			{/if}
			{#if currentAudio}
				{@const audio = getAssetFromId(currentAudio.assetId)}
				{#if audio}
					<audio
						class="hidden"
						src={convertFileSrc(audio.filePath)}
						bind:this={audioComponent}
						muted={currentAudio.isMuted}
					></audio>
				{/if}
			{/if}
		{:else}{/if}
	</div>

	<section
		id="controles"
		class="absolute bottom-0 h-16 w-full bg-[#141616] border-t-2 border-[#363232]"
	>
		<div class="flex flex-row items-center justify-center h-full w-full relative">
			<p class="monospace text-lg absolute left-4 rounded-xl bg-[#110f0f] px-3 py-1">
				{currentTime[0]}<span class="text-xs">.{currentTime[1]}</span> / {secondsToHHMMSS(
					getLastClipEnd($currentProject.timeline)
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

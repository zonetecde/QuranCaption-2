<script lang="ts">
	import { secondsToHHMMSS, type SubtitleClip } from '$lib/classes/Timeline';
	import { getAssetFromId } from '$lib/ext/Id';
	import { currentProject } from '$lib/stores/ProjectStore';
	import { spaceBarPressed } from '$lib/stores/ShortcutStore';
	import {
		cursorPosition,
		forceUpdateCurrentPlayingMedia,
		getLastClipEnd,
		getTimelineTotalDuration
	} from '$lib/stores/TimelineStore';
	import { isPreviewPlaying } from '$lib/stores/VideoPreviewStore';
	import { convertFileSrc } from '@tauri-apps/api/tauri';

	import BurnedSubtitles from './BurnedSubtitles.svelte';
	import BackgroundOverlay from './BackgroundOverlay.svelte';
	import ControlBar from './ControlBar.svelte';

	export let hideControls = false;

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
	let currentSubtitle: SubtitleClip;

	$: if ($spaceBarPressed) {
		handlePlayVideoButtonClicked();
		spaceBarPressed.set(false);
	}

	let videoComponent: HTMLVideoElement;
	let audioComponent: HTMLAudioElement;

	/**
	 * Force la mise à jour de la vidéo et de l'audio en cours de lecture par rapport à la position du curseur.
	 */
	$: if ($forceUpdateCurrentPlayingMedia) {
		forceUpdateCurrentPlayingMedia.set(false);
		if (currentVideo && videoComponent)
			videoComponent.currentTime = ($cursorPosition - currentVideo.start) / 1000;
		if (currentAudio && audioComponent)
			audioComponent.currentTime = ($cursorPosition - currentAudio.start) / 1000;
	}

	/**
	 * Se charge de bien placer le bon moment dans la vidéo et l'audio en fonction de la position du curseur.
	 */
	let lastTime = 0;
	$: if ($cursorPosition || $isPreviewPlaying) {
		const currentTime = new Date().getTime();
		// < 100 ms ? (permet de ne pas spam la reactivity après le setTimeout)
		if (currentTime - lastTime > 10) {
			lastTime = currentTime;

			if (!$isPreviewPlaying && currentVideo && videoComponent) {
				// Update the video to the cursor position. When playing the video will start from the cursor position
				// Le timeout est nécessaire : c'est un fix du bug 1
				setTimeout(() => {
					videoComponent.currentTime = ($cursorPosition - currentVideo.start) / 1000;
				}, 0);
			}

			if (!$isPreviewPlaying && currentAudio && audioComponent) {
				// Update the audio to the cursor position. When playing the audio will start from the cursor position
				// Le timeout est nécessaire : c'est un fix du bug 1
				setTimeout(() => {
					audioComponent.currentTime = ($cursorPosition - currentAudio.start) / 1000;
				}, 0);
			}
		}
	}

	/**
	 * Handles the click event of the play video button.
	 * Toggles the value of `isPreviewPlaying` and calls `playVideo()` if `isPreviewPlaying` is true.
	 */
	function handlePlayVideoButtonClicked() {
		isPreviewPlaying.set(!$isPreviewPlaying);

		if ($isPreviewPlaying) {
			playVideo();
		}
	}

	/**
	 * Plays the video and audio components in the preview.
	 * The function continuously updates the cursor position and checks if the preview is still playing.
	 * If the preview is playing and there are video or audio components, the cursor position is incremented by 10.
	 * The video and audio components are then played.
	 * If the preview is not playing or there are no video or audio components, the video and audio components are paused.
	 * The function is executed every 10 milliseconds using setInterval.
	 */
	function playVideo() {
		const interval = setInterval(() => {
			if ($isPreviewPlaying && (videoComponent || audioComponent)) {
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

<div class="w-full h-full flex flex-col relative overflow-hidden">
	<div class={'h-full relative bg-[#0f0d0d] ' + (hideControls ? '' : 'pb-16')}>
		{#if (currentVideo && currentVideo.assetId) || (currentAudio && currentAudio.assetId) || currentSubtitle}
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
			{:else}
				<div class="w-full h-full bg-black"></div>
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

			<BackgroundOverlay />

			<BurnedSubtitles
				bind:currentSubtitle
				{hideControls}
				{videoComponent}
				subtitleLanguage="arabic"
			/>
		{:else}<div class="w-full h-full bg-black"></div>{/if}
	</div>

	{#if hideControls === false}
		<ControlBar {currentTime} {handlePlayVideoButtonClicked} />
	{/if}
</div>
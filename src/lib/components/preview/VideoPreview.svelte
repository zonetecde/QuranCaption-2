<script lang="ts">
	import { secondsToHHMMSS, type SubtitleClip } from '$lib/models/Timeline';
	import { getAssetFromId } from '$lib/ext/Id';
	import { currentProject } from '$lib/stores/ProjectStore';
	import { spaceBarPressed } from '$lib/stores/ShortcutStore';
	import { cursorPosition, forceUpdateCurrentPlayingMedia, zoom } from '$lib/stores/TimelineStore';
	import { isPreviewPlaying } from '$lib/stores/VideoPreviewStore';
	import { convertFileSrc } from '@tauri-apps/api/tauri';

	import BurnedSubtitles from './BurnedSubtitles.svelte';
	import BackgroundOverlay from './BackgroundOverlay.svelte';
	import ControlBar from './ControlBar.svelte';
	import { getDisplayedVideoSize, reajustCursorPosition } from '$lib/ext/Utilities';
	import Page from '../../../routes/+page.svelte';
	import { fullScreenPreview, videoDimensions } from '$lib/stores/LayoutStore';
	import { onDestroy, onMount } from 'svelte';
	import BurnedCreatorText from './BurnedCreatorText.svelte';

	export let hideControls = false;

	onMount(async () => {
		window.onresize = calculateVideoDimensions;
		calculateVideoDimensions();
	});

	onDestroy(() => {
		window.onresize = null;
	});

	$: $currentProject.projectSettings.subtitlesTracksSettings, calculateVideoDimensions();
	$: $fullScreenPreview, calculateVideoDimensions();

	async function calculateVideoDimensions() {
		setTimeout(async () => {
			// tant que la vidéo n'a pas chargé
			while (videoComponent === undefined || videoComponent.videoWidth === 0) {
				await new Promise((resolve) => setTimeout(resolve, 100));
			}

			if (videoComponent) {
				const _videoDimensions = getDisplayedVideoSize(videoComponent);
				videoDimensions.set({
					width: _videoDimensions.displayedWidth,
					height: _videoDimensions.displayedHeight
				});
			}
		}, 1);
	}

	$: currentTime = secondsToHHMMSS($cursorPosition / 1000); // [0] = HH:MM:SS, [1] = milliseconds

	$: currentVideo = $currentProject.timeline.videosTracks[0].clips.find(
		(video) =>
			(video.start === 0 && video.start <= $cursorPosition && video.end >= $cursorPosition) || // Le + 1 permet de prevent un bug qui fait que le curseur ne va pas sur la deuxième vidéo lorsque la première se termine (il faut laisser le temps à l'id de la nouvelle vidéo de se mettre dans les classes du videoComponent)
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

	$: if (currentVideo === undefined && $isPreviewPlaying) {
		// Stop the preview if there is no video to play
		isPreviewPlaying.set(false);
	}

	let videoComponent: HTMLVideoElement;
	let audioComponent: HTMLAudioElement;

	/**
	 * Force la mise à jour de la vidéo et de l'audio en cours de lecture par rapport à la position du curseur.
	 */
	$: if ($forceUpdateCurrentPlayingMedia) {
		forceUpdateCurrentPlayingMedia.set(false);
		if (currentVideo && videoComponent) {
			videoComponent.currentTime = ($cursorPosition - currentVideo.start) / 1000;
		}
		if (currentAudio && audioComponent)
			audioComponent.currentTime = ($cursorPosition - currentAudio.start) / 1000;
	}

	/**
	 * Se charge de bien placer le bon moment dans la vidéo et l'audio en fonction de la position du curseur.
	 */
	let lastTimeFirstInterval = 0;
	$: if ($cursorPosition || $isPreviewPlaying) {
		const currentTime = new Date().getTime();
		// < 100 ms ? (permet de ne pas spam la reactivity après le setTimeout)
		if (currentTime - lastTimeFirstInterval > 10) {
			lastTimeFirstInterval = currentTime;

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
				// Réajuste la position du curseur pour éviter des problèmes de sync
				reajustCursorPosition();

				// Si on arrive à la fin de la timeline, on scroll un peu pour voir la fin
				if ($zoom === 30 && $cursorPosition > 5000 && ($cursorPosition * $zoom) % 1000 < 300) {
					// @ts-ignore
					document.getElementById('timeline').scrollLeft += 1;
				}

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
	<div class={'h-full relative bg-[#0f0d0d] ' + (hideControls ? '' : 'pb-16')} id="preview">
		{#if (currentVideo && currentVideo.assetId) || (currentAudio && currentAudio.assetId) || currentSubtitle}
			{#if currentVideo}
				{@const video = getAssetFromId(currentVideo.assetId)}
				{#if video}
					<video
						class={'bg-red-black w-full h-full object-contain ' + currentVideo.id}
						id="video-preview"
						style="
							transform: scale({$currentProject.projectSettings.videoScale}) translateX({$videoDimensions.width *
							($currentProject.projectSettings.translateVideoX / 100)}px);
						"
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

			<BurnedSubtitles bind:currentSubtitle {hideControls} subtitleLanguage="arabic" />

			{#each $currentProject.projectSettings.addedTranslations as translation}
				<BurnedSubtitles bind:currentSubtitle {hideControls} subtitleLanguage={translation} />
			{/each}

			<BurnedCreatorText />
		{:else}<div class="w-full h-full bg-black"></div>{/if}
	</div>

	{#if hideControls === false}
		<ControlBar {currentTime} {handlePlayVideoButtonClicked} />
	{/if}
</div>

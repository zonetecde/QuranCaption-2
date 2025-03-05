<script lang="ts">
	import { secondsToHHMMSS, type SubtitleClip } from '$lib/models/Timeline';
	import { getAssetFromId } from '$lib/ext/Id';
	import { currentProject } from '$lib/stores/ProjectStore';
	import { spaceBarPressed } from '$lib/stores/ShortcutStore';
	import {
		cursorPosition,
		forceUpdateCurrentPlayingMedia,
		scrollToCursor,
		zoom
	} from '$lib/stores/TimelineStore';
	import { isPreviewPlaying } from '$lib/stores/VideoPreviewStore';
	import { convertFileSrc } from '@tauri-apps/api/tauri';

	import BurnedSubtitles from './BurnedSubtitles.svelte';
	import BackgroundOverlay from './BackgroundOverlay.svelte';
	import ControlBar from './ControlBar.svelte';
	import { getDisplayedVideoSize, reajustCursorPosition } from '$lib/ext/Utilities';
	import {
		fullScreenPreview,
		setCurrentVideoTime,
		videoDimensions,
		videoSpeed
	} from '$lib/stores/LayoutStore';
	import { onDestroy, onMount } from 'svelte';
	import BurnedCreatorText from './BurnedCreatorText.svelte';
	import { fade } from 'svelte/transition';

	export let hideControls = false;

	onMount(async () => {
		window.onresize = calculateVideoDimensions;
		calculateVideoDimensions();
	});

	onDestroy(() => {
		window.onresize = null;
	});

	$: if ($videoSpeed) {
		if (videoComponent) {
			videoComponent.playbackRate = $videoSpeed;
		}
		if (audioComponent) {
			audioComponent.playbackRate = $videoSpeed;
		}
	}

	$: $currentProject.projectSettings.subtitlesTracksSettings, calculateVideoDimensions();
	$: $fullScreenPreview, calculateVideoDimensions();

	$: backgroundImg = $currentProject.projectSettings.globalSubtitlesSettings.backgroundImage
		? convertFileSrc($currentProject.projectSettings.globalSubtitlesSettings.backgroundImage)
		: 'black.jpg';

	async function calculateVideoDimensions() {
		setTimeout(async () => {
			// tant que la vidéo n'a pas chargé
			while (videoComponent === undefined || (videoComponent && videoComponent.videoWidth === 0)) {
				await new Promise((resolve) => setTimeout(resolve, 100));
			}

			if (videoComponent) {
				const _videoDimensions = getDisplayedVideoSize(videoComponent);

				if (_videoDimensions.displayedHeight !== 0 && _videoDimensions.displayedWidth !== 0) {
					videoDimensions.set({
						width: _videoDimensions.displayedWidth,
						height: _videoDimensions.displayedHeight
					});
				} else {
					// Image de fond noir
					const imgElement = document.getElementById('bg-img') as HTMLImageElement;

					videoDimensions.set({
						width: imgElement.clientWidth,
						height: imgElement.clientHeight
					});
				}
			}
		}, 1);
	}

	// Pour que le gif 'subscribe' commence au début
	let gifKey = 0;
	let prevInRange: number | boolean = false;
	$: subscribeButtonSettings =
		$currentProject.projectSettings.globalSubtitlesSettings.subscribeButton;
	$: subscribeButtonStartTime = subscribeButtonSettings
		? subscribeButtonSettings.startTime * 1000
		: 0;

	$: subscribeButtonEndTime = subscribeButtonStartTime + 4500;
	$: {
		const currentInRange =
			$cursorPosition &&
			$cursorPosition > subscribeButtonStartTime &&
			$cursorPosition < subscribeButtonEndTime;
		if (currentInRange && !prevInRange) {
			gifKey = Date.now();
		}
		prevInRange = currentInRange;
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

	// Set the current time of the video and audio components to the value of `setCurrentVideoTime`
	$: if ($setCurrentVideoTime) {
		if (currentVideo) {
			videoComponent.currentTime = $setCurrentVideoTime;
		}

		if (currentAudio) {
			audioComponent.currentTime = $setCurrentVideoTime;
		}

		setCurrentVideoTime.set(undefined);
	}

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
				reajustCursorPosition(true);

				scrollToCursor();

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
						class={'bg-red-black w-full h-full object-contain ' +
							currentVideo.id +
							' ' +
							(video.type === 'video' && video.id !== 'black-video' ? '' : 'hidden')}
						id="video-preview"
						style="
							transform: scale({$currentProject.projectSettings.videoScale}) translateX({$videoDimensions.width *
							($currentProject.projectSettings.translateVideoX / 100)}px);
						"
						src={video.type === 'image'
							? convertFileSrc('./black-vid.mp4')
							: convertFileSrc(video.filePath)}
						bind:this={videoComponent}
						muted={currentVideo.isMuted}
					>
						<track kind="captions" default />
					</video>

					{#if video.type === 'image' || video.id === 'black-video'}
						<img
							id="bg-img"
							class="w-full h-full object-contain"
							src={video.id === 'black-video' ? backgroundImg : convertFileSrc(video.filePath)}
							alt={video.filePath}
						/>
					{/if}
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
						id="audio-preview"
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

			{#if subscribeButtonSettings && subscribeButtonSettings.enable && $cursorPosition && $cursorPosition > subscribeButtonStartTime && $cursorPosition < subscribeButtonEndTime}
				<img
					src={`/icons/subscribe.gif?key=${gifKey}`}
					alt="Subscribe"
					class="absolute opacity-50"
					style={subscribeButtonSettings.position === 'TL'
						? 'top: 3rem; left: 3rem;'
						: subscribeButtonSettings.position === 'TR'
							? 'top: 3rem; right: 3rem;'
							: subscribeButtonSettings.position === 'BL'
								? 'bottom: 3rem; left: 3rem;'
								: subscribeButtonSettings.position === 'BR'
									? 'bottom: 3rem; right: 3rem;'
									: subscribeButtonSettings.position === 'TC'
										? 'top: 3rem; left: 50%; transform: translateX(-50%);'
										: 'bottom: 1.5rem; left: 50%; transform: translateX(-50%);'}
					width="200"
					height="100"
					transition:fade
				/>
			{/if}
		{:else}<div class="w-full h-full bg-black"></div>{/if}
	</div>

	{#if hideControls === false}
		<ControlBar {currentTime} {handlePlayVideoButtonClicked} />
	{/if}
</div>

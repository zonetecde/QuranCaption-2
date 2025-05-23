<script lang="ts">
	import { secondsToHHMMSS, type SubtitleClip } from '$lib/models/Timeline';
	import { currentProject } from '$lib/stores/ProjectStore';
	import { spaceBarPressed } from '$lib/stores/ShortcutStore';
	import {
		cursorPosition,
		forceUpdateCurrentPlayingMedia,
		scrollToCursor
	} from '$lib/stores/TimelineStore';
	import { isPreviewPlaying } from '$lib/stores/VideoPreviewStore';
	import {
		topRatio,
		middleRatio,
		bottomRatio,
		exportType,
		currentlyExporting,
		triggerSubtitleResize
	} from '$lib/stores/ExportStore';
	import { convertFileSrc } from '@tauri-apps/api/tauri';

	import { readjustCursorPosition } from '$lib/functions/TimelineHelper';
	import { getDisplayedVideoSize } from '$lib/functions/VideoPreviewCalc';
	import { getAssetFromId } from '$lib/models/Asset';
	import {
		currentPage,
		fullScreenPreview,
		setCurrentVideoTime,
		videoDimensions,
		videoSpeed
	} from '$lib/stores/LayoutStore';
	import { onDestroy, onMount } from 'svelte';
	import { fade } from 'svelte/transition';
	import BackgroundOverlay from './BackgroundOverlay.svelte';
	import BurnedCreatorText from './BurnedCreatorText.svelte';
	import BurnedSubtitles from './BurnedSubtitles.svelte';
	import ControlBar from './ControlBar.svelte';
	import BurnedSurahName from './BurnedSurahName.svelte';
	import VideoSectionRatio from './VideoSectionRatio.svelte';
	import BurnedSubscribeButton from './BurnedSubscribeButton.svelte';
	import BurnedWm from './BurnedWm.svelte';

	export let hideControls = false;
	let isPreviewLoading = true;

	onMount(async () => {
		window.onresize = calculateVideoDimensions;
		calculateVideoDimensions();

		setTimeout(() => {
			resizeVideoToFitScreen(); // appel ici au cas où la vidéo est une ressource non trouvée
		}, 300);
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

			resizeVideoToFitScreen();
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

	// Set the current time of the video and audio components to the value of `setCurrentVideoTime`
	$: if ($setCurrentVideoTime) {
		if (currentVideo && videoComponent) {
			videoComponent.currentTime = $setCurrentVideoTime;
		}

		if (currentAudio && audioComponent) {
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
				readjustCursorPosition(true);

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

	/**
	 * sorry i cant explain that lol but it works
	 */
	function resizeVideoToFitScreen() {
		const previewContainer = document.getElementById('preview-container');
		const preview = document.getElementById('preview');
		// Ajuste le scale de `preview` pour qu'il s'adapte au container sans jamais s'étirer
		if (previewContainer && preview) {
			// On met le 1920x1080 ici pour éviter d'avoir un effet bizarre lorsque le component load
			preview.style.width = '1920px';
			preview.style.height = '1080px'; // Si on est en plein écran, on met la vidéo à la taille de l'écran
			preview.style.minWidth = '1920px';
			preview.style.minHeight = '1080px';
			if ($fullScreenPreview) {
				previewContainer.style.width = '100%';
				previewContainer.style.height = '100%';
			} else {
				// Sinon taille du container avec 100px de moins en hauteur
				previewContainer.style.width = 'auto';
				previewContainer.style.height = 'calc(100% - 100px)';

				// reset les centrages
				previewContainer.style.position = 'relative';
				previewContainer.style.zIndex = '0';
				previewContainer.style.transform = 'none';
				previewContainer.style.top = '0';
				previewContainer.style.left = '0';

				// remove the black div if it exists
				const blackCovers = document.getElementsByClassName('black-cover');
				for (let i = 0; i < blackCovers.length; i++) {
					blackCovers[i].remove();
				}
			}

			const containerWidth = previewContainer.clientWidth;
			const containerHeight = previewContainer.clientHeight - ($fullScreenPreview ? 0 : 432);

			const videoWidth = preview.clientWidth;
			const videoHeight = preview.clientHeight;

			const widthRatio = containerWidth / videoWidth;
			const heightRatio = containerHeight / videoHeight;

			// Utilise le plus petit ratio pour éviter l'étirement
			const scale = Math.min(widthRatio, heightRatio);

			// Applique le scale à la preview
			preview.style.transform = `scale(${scale})`;

			if (!$fullScreenPreview) {
				// met la taille de preview-container à la taille de preview
				previewContainer.style.width = `${videoWidth * scale}px`;
				previewContainer.style.height = `${videoHeight * scale}px`;

				// center the preview container horizontally
				previewContainer.style.left = '50%';
				previewContainer.style.transform = 'translateX(-50%)';
			} else {
				// centre la preview verticalement et horizontalement
				previewContainer.style.position = 'absolute';
				previewContainer.style.zIndex = '1000';
				previewContainer.style.inset = '0'; // Utilise inset pour positionner le container

				// Centre le conteneur en mode plein écran
				const windowHeight = window.innerHeight;
				const scaledVideoHeight = videoHeight * scale;
				const topOffset = Math.max(0, (windowHeight - scaledVideoHeight) / 2);

				previewContainer.style.top = `${topOffset}px`;
				previewContainer.style.left = '50%';
				previewContainer.style.transform = 'translateX(-50%)';

				previewContainer.style.width = `${videoWidth * scale}px`;
				previewContainer.style.height = `${videoHeight * scale}px`;
			}
		}

		isPreviewLoading = false;
	}
</script>

<div class="w-full h-full flex flex-col relative overflow-hidden" id="preview-container">
	<div class={'relative origin-top-left bg-black'} id="preview">
		{#if (currentVideo && currentVideo.assetId) || (currentAudio && currentAudio.assetId) || currentSubtitle}
			{#if currentVideo}
				{@const video = getAssetFromId(currentVideo.assetId)}
				{#if video}
					<video
						class={'w-full h-full object-contain' +
							currentVideo.id +
							' ' +
							(video.type === 'video' && video.id !== 'black-video' ? '' : 'hidden')}
						id="video-preview"
						style="
							transform: scale({$currentProject.projectSettings.videoScale}) translateX({$currentProject
							.projectSettings.translateVideoX}px) translateY({$currentProject.projectSettings
							.translateVideoY}px);
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

			<BurnedSurahName bind:currentSubtitle />
			<BurnedWm />

			<BurnedSubscribeButton />

			<VideoSectionRatio {hideControls} />
		{:else}<div class="w-full h-full bg-black"></div>{/if}
	</div>

	{#if isPreviewLoading}
		<div class="absolute inset-0 bg-black" out:fade={{ duration: 500 }}></div>
	{/if}
</div>

{#if !hideControls}
	<ControlBar {currentTime} {handlePlayVideoButtonClicked} />
{/if}

<style>
	.force-1920x1080 {
		width: 1920px;
		height: 1080px;
	}
</style>

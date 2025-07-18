<script lang="ts">
	import { TrackType } from '$lib/classes';
	import { globalState } from '$lib/runes/main.svelte';
	import { convertFileSrc } from '@tauri-apps/api/core';
	import { onMount, untrack } from 'svelte';
	import { Howl } from 'howler';

	let currentVideo = $derived(() => {
		return globalState.currentProject!.content.timeline.getCurrentAssetOnTrack(TrackType.Video);
	});
	let currentAudio = $derived(() => {
		return globalState.currentProject!.content.timeline.getCurrentAssetOnTrack(TrackType.Audio);
	});

	let videoElement = $state<HTMLVideoElement | null>(null);

	$effect(() => {
		// Si on change la taille de la timeline, on redimensionne la vidéo pour qu'elle s'adapte à l'écran
		if (globalState.currentProject?.projectEditorState.videoPreviewHeight) {
			resizeVideoToFitScreen();
		}
	});

	$effect(() => {
		// Si le curseur bouge, alors on doit aussi mettre à jour la vidéo au bon timing
		if (globalState.currentProject?.projectEditorState.timeline.movePreviewTo) {
			untrack(() => {
				const newTime = globalState.currentProject!.projectEditorState.timeline.movePreviewTo;
				// Met à jour la vidéo en fonction de la position du curseur
				// cursorPosition est en ms
				if (currentVideo()) {
					if (videoElement) {
						videoElement.currentTime = newTime / 1000; // Convertit en secondes
					}
				}

				// Met à jour l'audio en fonction de la position du curseur
				if (currentAudio()) {
					console.log('Seeking audio to', newTime);
					seekAudio(newTime / 1000); // Convertit en secondes
				}
			});
		}
	});

	onMount(() => {
		resizeVideoToFitScreen();
		window.addEventListener('resize', resizeVideoToFitScreen);

		videoElement!.ontimeupdate = handleTimeUpdate;
	});

	function handleTimeUpdate() {
		// Lorsque le temps actuel dans le composant <video> ou l'audio change, on met à jour le curseur de la timeline
		if (videoElement && videoElement!.currentTime) {
			globalState.currentProject!.projectEditorState.timeline.cursorPosition =
				videoElement!.currentTime * 1000; // Convertit en millisecondes
		}
	}

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

			// Sinon taille du container avec 100px de moins en hauteur
			previewContainer.style.width = 'auto';
			previewContainer.style.height = 'calc(100%)';

			// reset les centrages
			previewContainer.style.position = 'relative';
			previewContainer.style.zIndex = '0';
			previewContainer.style.transform = 'none';
			previewContainer.style.top = '0';
			previewContainer.style.left = '0';

			const containerWidth = previewContainer.clientWidth;
			const containerHeight = previewContainer.clientHeight;

			const videoWidth = preview.clientWidth;
			const videoHeight = preview.clientHeight;

			const widthRatio = containerWidth / videoWidth;
			const heightRatio = containerHeight / videoHeight;

			// Utilise le plus petit ratio pour éviter l'étirement
			const scale = Math.min(widthRatio, heightRatio);

			// Applique le scale à la preview
			preview.style.transform = `scale(${scale})`;

			// met la taille de preview-container à la taille de preview
			previewContainer.style.width = `${videoWidth * scale}px`;
			previewContainer.style.height = `${videoHeight * scale}px`;

			// center the preview container horizontally
			previewContainer.style.left = '50%';
			previewContainer.style.transform = 'translateX(-50%)';

			// center the preview container vertically
			previewContainer.style.top = '50%';
			previewContainer.style.transform += ' translateY(-50%)';
		}
	}

	let audioHowl: Howl | null = null;
	let isPlaying = $state(false);
	let audioDuration = $state(0);
	let audioSeek = $state(0);
	let audioInterval: any = null;

	function setupAudio() {
		if (audioHowl) {
			audioHowl.unload();
			audioHowl = null;
		}
		const audioAsset = currentAudio();
		if (audioAsset) {
			audioHowl = new Howl({
				src: [convertFileSrc(audioAsset.filePath)],
				html5: true, // important pour les gros fichiers et le VBR
				onload: () => {
					audioDuration = audioHowl?.duration() || 0;
				},
				onend: () => {
					isPlaying = false;
					clearInterval(audioInterval);
				}
			});
		}
	}

	function play() {
		if (audioHowl) {
			audioHowl.play();
			isPlaying = true;
		}
		const videoElement = document.querySelector('#preview video') as HTMLVideoElement;
		if (videoElement) {
			videoElement.play();
		}
	}

	function pause() {
		if (audioHowl) {
			audioHowl.pause();
			isPlaying = false;
			clearInterval(audioInterval);
		}
		const videoElement = document.querySelector('#preview video') as HTMLVideoElement;
		if (videoElement) {
			videoElement.pause();
		}
	}

	function seekAudio(val: number) {
		if (audioHowl) {
			audioHowl.seek(val);
			audioSeek = val;
		}
	}

	$effect(() => {
		setupAudio();
		return () => {
			if (audioHowl) audioHowl.unload();
			clearInterval(audioInterval);
		};
	});
</script>

<div
	class="w-full h-full flex flex-col relative overflow-hidden background-primary"
	id="preview-container"
>
	<div class={'relative origin-top-left bg-black'} id="preview">
		{#if currentVideo()}
			<video bind:this={videoElement} src={convertFileSrc(currentVideo()!.filePath)} muted></video>
		{:else}
			<video bind:this={videoElement} src="black-vid.mp4" muted></video>
		{/if}
	</div>
</div>

<button
	class="absolute bottom-2 left-2 z-10 bg-[var(--bg-secondary)] text-[var(--text-secondary)] p-2 rounded hover:bg-[var(--bg-accent)] transition-colors"
	on:click={() => {
		if (isPlaying) {
			pause();
		} else {
			play();
		}
	}}
>
	{isPlaying ? 'Pause' : 'Play'}
</button>

<style>
	#preview-container {
		height: 100%;
		min-height: 0;
	}
	#preview {
		height: 100%;
		min-height: 0;
	}
	video {
		height: 100% !important;
		width: 100% !important;
		min-height: 0 !important;
		display: block;
	}
</style>

<script lang="ts">
	import { TrackType } from '$lib/classes';
	import { globalState } from '$lib/runes/main.svelte';
	import { convertFileSrc } from '@tauri-apps/api/core';
	import Page from '../../../../routes/+page.svelte';
	import { onMount } from 'svelte';

	let currentVideo = $derived(() => {
		return globalState.currentProject!.content.timeline.getCurrentAssetOnTrack(TrackType.Video);
	});
	let currentAudio = $derived(() => {
		return globalState.currentProject!.content.timeline.getCurrentAssetOnTrack(TrackType.Audio);
	});

	$inspect(currentVideo());
	$inspect(currentAudio());

	$effect(() => {
		if (globalState.currentProject?.projectEditorState.videoPreviewHeight) {
			resizeVideoToFitScreen();
		}
	});

	onMount(() => {
		resizeVideoToFitScreen();
		window.addEventListener('resize', resizeVideoToFitScreen);
	});

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
</script>

<div
	class="w-full h-full flex flex-col relative overflow-hidden background-primary"
	id="preview-container"
>
	<div class={'relative origin-top-left bg-black'} id="preview">
		{#if currentVideo()}
			<video src={convertFileSrc(currentVideo()!.filePath)} controls muted></video>
		{/if}
	</div>
</div>

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

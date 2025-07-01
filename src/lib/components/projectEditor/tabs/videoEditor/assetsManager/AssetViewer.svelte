<script lang="ts">
	import { AssetType, type Asset } from '$lib/classes';
	import { convertFileSrc } from '@tauri-apps/api/core';

	let {
		asset
	}: {
		asset: Asset;
	} = $props();
</script>

<div
	class="flex flex-col py-2 px-2 bg-gray-800 rounded-lg shadow-md group transition-all duration-300"
>
	{#if asset.type === AssetType.Audio}
		<div class="audio-player-container">
			<audio class="w-full opacity-60 mb-3" controls>
				<source src={convertFileSrc(asset.filePath)} type="audio/mp3" />
				Your browser does not support the audio element.
			</audio>
		</div>
	{:else if asset.type === AssetType.Video}
		<div class="video-player-container">
			<video class="w-full mb-3" controls>
				<track kind="captions" />
				<source src={convertFileSrc(asset.filePath)} type="video/mp4" />
				Your browser does not support the video tag.
			</video>
		</div>
	{/if}

	<div class="flex flex-row gap-x-2 items-center">
		<span class="material-icons text-4xl text-indigo-400">
			{asset.type === 'video' ? 'video_library' : 'music_note'}
		</span>
		<p class="text-sm font-semibold text-gray-100 truncate">{asset.fileName}</p>
	</div>
</div>

<style>
	.audio-player-container {
		opacity: 0;
		max-height: 0;
		overflow: hidden;
		transition:
			opacity 0.3s ease-out,
			max-height 0.3s ease-out;
	}

	.group:hover .audio-player-container {
		opacity: 1;
		max-height: 80px; /* Ajustez selon la hauteur de votre lecteur audio */
	}

	.video-player-container {
		opacity: 0;
		max-height: 0;
		overflow: hidden;
		transition:
			opacity 0.3s ease-out,
			max-height 0.3s ease-out;
	}

	.group:hover .video-player-container {
		opacity: 1;
		max-height: 300px; /* Ajustez selon la hauteur de votre lecteur vidéo */
	}
</style>

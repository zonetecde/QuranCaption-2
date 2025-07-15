<script lang="ts">
	import toast from 'svelte-5-french-toast';
	import { invoke } from '@tauri-apps/api/core';
	import { projectService } from '$lib/services/ProjectService';
	import { globalState } from '$lib/runes/main.svelte';
	import { Asset, AssetType } from '$lib/classes';
	import Section from '$lib/components/projectEditor/Section.svelte';

	let url: string = $state('');
	let type: string = $state('audio'); // Default to audio

	async function downloadAssetFromYouTube() {
		try {
			if (!url.trim()) {
				toast.error('Please enter a valid YouTube video URL.');
				return;
			}

			const downloadPath = await projectService.getAssetFolderForProject(
				globalState.currentProject!.detail.id
			);

			const result: any = await toast.promise(
				invoke('download_from_youtube', {
					url: url.trim(),
					type: type,
					downloadPath: downloadPath
				}),
				{
					loading: 'Downloading from YouTube...',
					success: 'Download successful!',
					error: 'Download failed!'
				}
			);

			// Ajoute le fichier téléchargé à la liste des assets du projet
			globalState.currentProject!.content.addAsset(result, url);
		} catch (error) {
			toast.error('Error downloading from YouTube: ' + error);
		}
	}
</script>

<Section icon="cloud_download" name="Download from YouTube" classes="mt-7">
	<input
		type="text"
		class="w-full bg-gray-800 border border-gray-700 rounded-md py-2 px-3 mt-2 text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
		placeholder="Enter YouTube video URL"
		bind:value={url}
	/>

	<!-- choice : video or audio -->
	<span class="text-sm text-gray-500 mt-3">Choose the type of media you want to download</span>

	<div class="flex items-center mt-2">
		<input
			type="radio"
			id="audio"
			name="mediaType"
			value="audio"
			checked
			class=" mr-2"
			onchange={() => (type = 'audio')}
		/>
		<label for="audio" class="text-sm text-gray-100 cursor-pointer">Audio</label>
		<input
			type="radio"
			id="video"
			name="mediaType"
			value="video"
			class="mr-2 ml-4"
			onchange={() => (type = 'video')}
		/>
		<label for="video" class="text-sm text-gray-100 cursor-pointer">Video</label>
	</div>

	<button
		class="w-full flex items-center justify-center bg-indigo-600 hover:bg-indigo-700 text-white py-2 px-3 rounded-md text-sm mt-4 cursor-pointer transition-colors duration-200"
		type="button"
		onclick={downloadAssetFromYouTube}
	>
		<span class="material-icons mr-2 text-base">download</span>Download
	</button>
</Section>

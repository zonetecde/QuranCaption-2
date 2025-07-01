<script lang="ts">
	import toast from 'svelte-5-french-toast';
	import { invoke } from '@tauri-apps/api/core';
	import { projectService } from '$lib/services/ProjectService';
	import { globalState } from '$lib/runes/main.svelte';
	import { Asset, AssetType } from '$lib/classes';
	import { getAssetTypeFromString } from '$lib/classes/enums';

	let url: string = $state('');
	let type: string = $state('audio'); // Default to audio

	async function downloadAssetFromYouTube() {
		try {
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
			const newAsset = new Asset(
				result.file_name,
				result.file_path,
				getAssetTypeFromString(type)!,
				result.duration,
				true,
				url
			);

			globalState.currentProject!.content.addAsset(newAsset);
		} catch (error) {
			toast.error('Error downloading from YouTube: ' + error);
		}
	}
</script>

<div class="flex mt-10">
	<h3 class="text-sm font-semibold text-gray-100 flex items-center">
		<span class="material-icons mr-2 text-lg text-indigo-400"> cloud_download </span>Download from
		YouTube
	</h3>
	<!-- dropdownicon -->
	<button class="flex items-center ml-auto cursor-pointer rotate-180">
		<span class="material-icons text-4xl! text-indigo-400">arrow_drop_down</span>
	</button>
</div>

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

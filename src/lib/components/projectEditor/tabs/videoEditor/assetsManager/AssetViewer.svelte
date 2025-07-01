<script lang="ts">
	import { AssetType, type Asset } from '$lib/classes';
	import { convertFileSrc } from '@tauri-apps/api/core';

	let {
		asset
	}: {
		asset: Asset;
	} = $props();
</script>

<div class="flex flex-col py-2 px-2 bg-gray-800 rounded-lg shadow-md">
	{#if asset.type === AssetType.Audio}
		<audio class="w-full" controls>
			<source src={convertFileSrc(asset.filePath)} type="audio/mp3" />
			Your browser does not support the audio element.
		</audio>
	{:else if asset.type === AssetType.Video}
		<video class="w-full" controls>
			<source src={convertFileSrc(asset.filePath)} type="video/mp4" />
			Your browser does not support the video tag.
		</video>
	{/if}

	<div class="flex flex-row gap-x-2 items-center">
		<span class="material-icons text-4xl text-indigo-400">
			{asset.type === 'video' ? 'video_library' : 'music_note'}
		</span>
		<p class="text-sm font-semibold text-gray-100 truncate">{asset.fileName}</p>
	</div>
</div>

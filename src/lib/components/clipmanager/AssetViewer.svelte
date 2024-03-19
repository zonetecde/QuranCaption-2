<script lang="ts">
	import type Asset from '$lib/classes/Asset';
	import { convertFileSrc } from '@tauri-apps/api/tauri';

	export let asset: Asset;
</script>

<div
	class="flex items-center justify-between p-2 border-b-2 flex-col max-w-full border-4 border-[#423f3f] rounded-2xl py-4 bg-[#0f0e0e]"
>
	{#if asset.type === 'video'}
		<video src={convertFileSrc(asset.filePath)} class="w-full object-cover" controls>
			<track kind="captions" />
		</video>
	{:else if asset.type === 'image'}
		<img src={convertFileSrc(asset.filePath)} class="w-full object-cover" alt={asset.filePath} />
	{:else if asset.type === 'audio'}
		<img src="/icons/audio.png" class="w-full h-28 object-cover" alt={asset.filePath} />

		<audio src={convertFileSrc(asset.filePath)} class="w-full object-cover" controls></audio>
	{:else}
		<p class="text-white">Unsupported file type</p>
	{/if}

	<p class="text-white mt-4 text-center">{asset.fileName}</p>
</div>

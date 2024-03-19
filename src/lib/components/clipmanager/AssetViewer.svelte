<script lang="ts">
	import type Asset from '$lib/classes/Asset';
	import { convertFileSrc } from '@tauri-apps/api/tauri';

	export let asset: Asset;
</script>

<div class="flex items-center justify-between p-2 border-b-2 border-[#1f1f1f] flex-col max-w-full">
	{#if asset.type === 'video' || asset.type === 'audio'}
		<video src={convertFileSrc(asset.filePath)} class="w-full object-cover" controls>
			<track kind="captions" />
		</video>
	{:else if asset.type === 'image'}
		<img src={convertFileSrc(asset.filePath)} class="w-full object-cover" alt={asset.filePath} />
	{/if}

	<p class="text-white ml-4">{asset.fileName}</p>
</div>

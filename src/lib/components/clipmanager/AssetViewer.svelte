<script lang="ts">
	import type Asset from '$lib/classes/Asset';
	import { convertFileSrc } from '@tauri-apps/api/tauri';

	export let asset: Asset;

	let isHovered = false;
</script>

<div
	class="group flex items-center justify-between p-2 border-b-2 flex-col max-w-full border-4 border-[#423f3f] rounded-2xl py-4 bg-[#0f0e0e]"
	on:mouseenter={() => (isHovered = true)}
	on:mouseleave={() => (isHovered = false)}
	role="contentinfo"
>
	{#if asset.type === 'video'}
		<video src={convertFileSrc(asset.filePath)} class="w-full object-cover" controls={isHovered}>
			<track kind="captions" />
		</video>
	{:else if asset.type === 'image'}
		<img src={convertFileSrc(asset.filePath)} class="w-full object-cover" alt={asset.filePath} />
	{:else if asset.type === 'audio'}
		<img
			src="/icons/audio.png"
			class="w-full h-16 object-contain block group-hover:hidden"
			alt={asset.filePath}
		/>

		<audio
			src={convertFileSrc(asset.filePath)}
			class="w-full h-16 object-cover hidden group-hover:block"
			controls
		></audio>
	{:else}
		<p class="text-white">Unsupported file type</p>
	{/if}

	<p class="text-white mt-4 text-center xl:text-sm text-base truncate w-full">{asset.fileName}</p>
</div>

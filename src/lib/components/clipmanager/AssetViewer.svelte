<script lang="ts">
	import type Asset from '$lib/classes/Asset';
	import { removeAsset } from '$lib/classes/Asset';
	import { convertFileSrc } from '@tauri-apps/api/tauri';

	export let asset: Asset;

	let isHovered = false;

	/**
	 * Remove the asset from the store
	 */
	function handleDeleteAssetButtonClicked() {
		removeAsset(asset.id);
	}
</script>

<div
	class="group flex items-center justify-between p-2 border-b-2 flex-col max-w-full border-4 border-[#423f3f] rounded-2xl py-4 bg-[#0f0e0e] relative"
	on:mouseenter={() => (isHovered = true)}
	on:mouseleave={() => (isHovered = false)}
	role="contentinfo"
>
	<div class="flex items-center h-[65%]">
		{#if asset.type === 'video'}
			<video src={convertFileSrc(asset.filePath)} class="w-full object-cover" controls={isHovered}>
				<track kind="captions" />
			</video>
		{:else if asset.type === 'image'}
			<img
				src={convertFileSrc(asset.filePath)}
				class="w-full object-cover max-h-40"
				alt={asset.filePath}
			/>
		{:else if asset.type === 'audio'}
			<img
				src="/icons/audio.png"
				class="w-full h-16 object-contain block group-hover:hidden"
				alt={asset.filePath}
			/>

			<audio
				src={convertFileSrc(asset.filePath)}
				class="w-40 h-16 hidden group-hover:block"
				controls
			></audio>
		{:else}
			<p class="text-white">Unsupported file type</p>
		{/if}
	</div>

	<p class="text-white mt-4 text-center xl:text-sm text-base truncate w-full">{asset.fileName}</p>

	<button
		class="w-6 h-6 absolute -top-3 -right-3 bg-white rounded-full hidden group-hover:block cursor-pointer"
		on:click={handleDeleteAssetButtonClicked}
	>
		<svg
			xmlns="http://www.w3.org/2000/svg"
			fill="none"
			viewBox="0 0 24 24"
			stroke-width="3"
			stroke="darkred"
		>
			<path
				stroke-linecap="round"
				stroke-linejoin="round"
				d="M15 12H9m12 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
			/>
		</svg>
	</button>
</div>

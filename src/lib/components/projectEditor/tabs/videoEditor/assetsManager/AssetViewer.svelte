<script lang="ts">
	import { AssetType, type Asset } from '$lib/classes';
	import { globalState } from '$lib/runes/main.svelte';
	import { convertFileSrc } from '@tauri-apps/api/core';
	import { exists } from '@tauri-apps/plugin-fs';
	import { onMount } from 'svelte';
	import { slide } from 'svelte/transition';

	let {
		asset = $bindable()
	}: {
		asset: Asset;
	} = $props();

	let isHovered = $state(false);

	onMount(async () => {
		asset.checkExistence();
	});
</script>

<div
	class="flex flex-col py-2 px-2 bg-gray-800 rounded-lg shadow-md transition-all duration-300 cursor-grab"
	role="button"
	tabindex="0"
	onmouseenter={() => (isHovered = true)}
	onmouseleave={() => (isHovered = false)}
>
	<div class="flex flex-row gap-x-2 items-center relative">
		<span class="material-icons text-4xl text-indigo-400">
			{asset.type === 'video' ? 'video_library' : 'music_note'}
		</span>
		<p class={'text-sm font-semibold text-gray-100 truncate ' + (!asset.exists ? 'mr-6' : '')}>
			{asset.fileName}
		</p>
		<!-- warning icon -->
		{#if !asset.exists}
			<span class="material-icons text-orange-400 absolute right-0.5" title="File not found on disk"
				>warning</span
			>
		{/if}
	</div>

	{#if asset.type === AssetType.Audio}
		{#if isHovered}
			<div transition:slide>
				<audio class="w-full opacity-60 mt-3" controls>
					<source src={convertFileSrc(asset.filePath)} type="audio/mp3" />
					Your browser does not support the audio element.
				</audio>
			</div>
		{/if}
	{:else if asset.type === AssetType.Video}
		{#if isHovered}
			<div transition:slide>
				<video class="w-full mt-3" controls>
					<track kind="captions" />
					<source src={convertFileSrc(asset.filePath)} type="video/mp4" />
					Your browser does not support the video tag.
				</video>
			</div>
		{/if}
	{/if}

	{#if isHovered}
		<div class="mt-2 px-2 py-0.5 flex flex-row gap-x-2 gap-y-1 flex-wrap" transition:slide>
			<button class="btn btn-icon gap-x-2 text-white py-1 px-3 rounded">
				<span class="material-icons text-lg">content_cut</span>
				Edit
			</button>
			<button
				class="btn btn-icon gap-x-2 text-white py-1 px-3 rounded"
				onclick={() => globalState.currentProject?.content.removeAsset(asset)}
			>
				<span class="material-icons text-lg">delete</span>
				Delete
			</button>
			<!-- open parent directoylt -->
			<button
				class="btn btn-icon gap-x-2 text-white py-1 px-3 rounded"
				onclick={async () => {
					await asset.openParentDirectory();
				}}
			>
				<span class="material-icons text-lg">folder_open</span>
				Open Directory
			</button>
		</div>
	{/if}
</div>

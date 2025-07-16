<script lang="ts">
	import { AssetType, type Asset } from '$lib/classes';
	import { globalState } from '$lib/runes/main.svelte';
	import { convertFileSrc } from '@tauri-apps/api/core';
	import { exists, readDir } from '@tauri-apps/plugin-fs';
	import { onMount } from 'svelte';
	import { slide } from 'svelte/transition';
	import ModalManager from '$lib/components/modals/ModalManager';
	import { openUrl } from '@tauri-apps/plugin-opener';
	import { WebviewWindow } from '@tauri-apps/api/webviewWindow';
	import { BaseDirectory, downloadDir } from '@tauri-apps/api/path';
	import toast from 'svelte-5-french-toast';
	import { open } from '@tauri-apps/plugin-dialog';

	let {
		asset = $bindable()
	}: {
		asset: Asset;
	} = $props();

	let isHovered = $state(false);

	onMount(async () => {
		asset.checkExistence();
	});

	async function editAsset() {
		const response = await ModalManager.confirmModal(
			'This will open a website that allows you to crop and trim your asset. Do you want to proceed?'
		);
		if (response) {
			// tauri open windows on url: https://online-video-cutter.com/
			const webview = new WebviewWindow('editor', {
				url:
					asset.type === AssetType.Video
						? 'https://online-video-cutter.com/'
						: asset.type === AssetType.Audio
							? 'https://mp3cut.net/'
							: 'https://www.iloveimg.com/crop-image',
				width: 1200,
				height: 800,
				title: 'Editor'
			});

			webview.once('tauri://close-requested', async function (e) {
				toast(
					'If you have downloaded your edited video, you can now import it back into the software',
					{
						duration: 7000
					}
				);

				webview.close();
			});
		}
	}

	async function relocateAsset() {
		// Open a dialog
		const file = await open({
			directory: false
		});

		if (!file) return;

		const element = file;
		asset.updateFilePath(element);
	}

	function addInTheTimelineButtonClick() {
		// Ajoute l'asset à la timeline
		asset.addToTimeline();
	}
</script>

<div
	class="flex flex-col py-2 px-2 bg-gray-800 rounded-lg shadow-md transition-all duration-300 select-none"
	role="button"
	tabindex="0"
	onmouseenter={() => (isHovered = true)}
	onmouseleave={() => (isHovered = false)}
>
	<div class="flex flex-row gap-x-2 items-center relative">
		<span class="material-icons text-4xl text-indigo-400">
			{asset.type === 'video' ? 'video_library' : asset.type === 'audio' ? 'music_note' : 'image'}
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
				<video class="w-full h-[200px] mt-3" controls>
					<track kind="captions" />
					<source src={convertFileSrc(asset.filePath)} type="video/mp4" />
					Your browser does not support the video tag.
				</video>
			</div>
		{/if}
	{:else if asset.type === AssetType.Image}
		{#if isHovered}
			<div transition:slide>
				<img
					class="w-full h-[200px] object-contain mt-3"
					src={convertFileSrc(asset.filePath)}
					alt={asset.fileName}
				/>
			</div>
		{/if}
	{/if}

	{#if isHovered}
		<div class="mt-2 px-2 py-0.5 flex flex-row gap-x-2 gap-y-1 flex-wrap" transition:slide>
			{#if asset.exists}
				<button
					class="btn btn-icon gap-x-2 text-white py-1 px-3 rounded"
					onclick={async () => {
						await asset.openParentDirectory();
					}}
				>
					<span class="material-icons text-lg">folder_open</span>
					Open Directory
				</button>

				<button class="btn btn-icon gap-x-2 text-white py-1 px-3 rounded" onclick={editAsset}>
					<span class="material-icons text-lg">crop</span>
					Edit
				</button>
			{:else}
				<button class="btn btn-icon gap-x-2 text-white py-1 px-3 rounded" onclick={relocateAsset}>
					<span class="material-icons text-lg">folder_open</span>
					Relocate
				</button>
			{/if}

			<button
				class="btn btn-icon gap-x-2 text-white py-1 px-3 rounded"
				onclick={() => globalState.currentProject?.content.removeAsset(asset)}
			>
				<span class="material-icons text-lg">delete</span>
				Remove
			</button>

			{#if asset.exists}
				<button
					class="btn-accent w-full btn-icon gap-x-2 text-white py-1 px-3 rounded text-sm"
					onclick={addInTheTimelineButtonClick}
				>
					<span class="material-icons text-lg">add</span>
					Add in the timeline
				</button>
			{/if}
		</div>
	{/if}
</div>

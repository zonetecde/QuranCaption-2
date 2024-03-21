<script lang="ts">
	import { open } from '@tauri-apps/api/dialog';
	import IconButton from '../common/IconButton.svelte';
	import { convertFileSrc } from '@tauri-apps/api/tauri';
	import { AudioFileExt, ImgFileExt, VideoFileExt } from '$lib/FileExt';
	import AssetViewer from './AssetViewer.svelte';
	import { addAssets } from '$lib/classes/Asset';
	import { currentProject } from '$lib/stores/ProjectStore';
	import { assets } from '$app/paths';

	function uploadAssets() {
		open({
			multiple: true,
			directory: false,
			defaultPath: 'C:\\Users\\User\\Videos',
			filters: [
				{
					name: 'Video | Audio | Image',
					extensions: VideoFileExt.concat(AudioFileExt).concat(ImgFileExt)
				}
			]
		}).then((result) => {
			if (result === null) return;

			// Add the selected files to the store
			addAssets(result);
		});
	}
</script>

<div class="flex flex-col h-full overflow-x-hidden overflow-y-scroll relative">
	<div
		class="w-full min-h-12 bg-[#302f2f] border-b-2 border-[#534c4c] flex items-center pl-4 pr-2 sticky top-0 z-20"
	>
		<h1 class="text-white">Assets</h1>
		<IconButton text="Import" on:click={uploadAssets} classes="ml-auto">
			<path
				stroke-linecap="round"
				stroke-linejoin="round"
				d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5"
			/>
		</IconButton>
	</div>

	<div class="bg-[#1f1f1f] flex flex-col flex-grow">
		<div class="gap-2 px-3 py-4 xl:grid xl:grid-cols-2 flex flex-col">
			{#if $currentProject}
				{#if $currentProject.assets.length === 0}
					<p class="text-white text-center mt-5 pr-4 text-sm absolute">
						Click the button above to import videos, audios and images for your project.
					</p>
				{:else}
					{#each $currentProject.assets as asset}
						<AssetViewer {asset} />
					{/each}
				{/if}
			{/if}
		</div>
	</div>
</div>

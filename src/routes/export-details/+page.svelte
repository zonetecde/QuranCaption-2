<script lang="ts">
	import { currentlyExportingVideos } from '$lib/stores/ExportStore';
	import { onDestroy, onMount } from 'svelte';
	import { listen } from '@tauri-apps/api/event';
	import { getExportPath } from '$lib/ext/LocalStorageWrapper';

	let listeners: any[] = [];

	onMount(async () => {
		const l1 = await listen('addExport', (event) => {
			//@ts-ignore
			currentlyExportingVideos.set([event.payload, ...$currentlyExportingVideos]);
		});
		listeners.push(l1);

		const l2 = await listen('updateExportDetailsById', (event) => {
			console.log(
				//@ts-ignore
				'editing export ' + event.payload.exportId + ' with status ' + event.payload.status
			);

			currentlyExportingVideos.update((videos) => {
				//@ts-ignore
				const index = videos.findIndex((video) => video.exportId === event.payload.exportId);
				if (index !== -1) {
					//@ts-ignore
					videos[index].status = event.payload.status;
					//@ts-ignore
					videos[index].progress = event.payload.progress;
				}
				return videos;
			});
			currentlyExportingVideos.set($currentlyExportingVideos);
		});
		listeners.push(l2);
	});

	onDestroy(() => {
		// Remove all listeners when the component is destroyed
		listeners.forEach((listener) => {
			listener(); // Call the listener function to remove it
		});
	});
</script>

<div class="h-screen flex flex-col overflow-x-hidden bg-[#242222] px-4 py-4 gap-y-3" id="container">
	{#if $currentlyExportingVideos.length > 0}
		{#each $currentlyExportingVideos as video}
			<div class="grid grid-cols-2-template border rounded-xl border-[#3b3b3b] bg-[#2a2a2a] p-4">
				<section class="flex flex-col w-full">
					<div class="text-sm">{video.projectName}</div>
					<div class="text-sm">Status: {video.status}</div>
				</section>
				<section class="flex flex-col ml-4">
					<div class="w-full bg-gray-700 rounded h-4 relative">
						<div class="bg-blue-500 h-4 rounded" style="width: {video.progress}%;"></div>
						<div class="absolute inset-0 flex items-center justify-center text-sm text-white">
							{video.progress}%
						</div>
					</div>

					<p class="text-sm mt-1">Output file: {video.outputPath}</p>
				</section>
			</div>
		{/each}
	{:else}
		<div class="flex items-center justify-center h-full">
			<div class="text-2xl">No videos are currently being exported</div>
		</div>
	{/if}
</div>

<style>
	.grid-cols-2-template {
		grid-template-columns: 30% 70%;
	}
</style>

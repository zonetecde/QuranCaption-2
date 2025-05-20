<script lang="ts">
	import { onDestroy, onMount } from 'svelte';
	import { listen } from '@tauri-apps/api/event';
	import { getExportPath } from '$lib/ext/LocalStorageWrapper';
	import type { VideoExportStatus } from '$lib/stores/ExportStore';
	import TitleBar from './TitleBar.svelte';

	let listeners: any[] = [];
	let currentlyExportingVideos: VideoExportStatus[] = [];

	onMount(async () => {
		const l1 = await listen('addExport', (event) => {
			// si l'export existe déjà, ne fait rien
			if (
				currentlyExportingVideos.find(
					//@ts-ignore
					(video) => video.exportId === event.payload.exportId
				)
			) {
				return;
			}

			//@ts-ignore
			currentlyExportingVideos = [event.payload, ...currentlyExportingVideos];
		});
		listeners.push(l1);

		const l2 = await listen('updateExportDetailsById', (event) => {
			console.log(
				//@ts-ignore
				'editing export ' + event.payload.exportId + ' with status ' + event.payload.status
			);

			//@ts-ignore
			const index = currentlyExportingVideos.findIndex(
				//@ts-ignore
				(video) => video.exportId === event.payload.exportId
			);
			if (index !== -1) {
				//@ts-ignore
				currentlyExportingVideos[index].status = event.payload.status;
				//@ts-ignore
				currentlyExportingVideos[index].progress = event.payload.progress;
			}
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

<TitleBar />
<div
	class="pt-14 h-screen flex flex-col overflow-x-hidden bg-[#242222] px-4 py-4 gap-y-3"
	id="container"
>
	{#if currentlyExportingVideos.length > 0}
		{#each currentlyExportingVideos as video}
			<div class="border rounded-xl border-[#3b3b3b] bg-[#2a2a2a] p-4 flex flex-col gap-y-2">
				<div class="text-sm">{video.projectName}</div>

				<div class="grid grid-cols-2-template">
					<section class="flex flex-col w-full">
						<div class="text-sm font-bold">Status: {video.status}</div>
						<p class="text-xs mt-1 col-span-full">
							Output file: {video.outputPath.split('/').pop()}
						</p>
					</section>
					<section class="flex flex-col ml-4">
						<div class="w-full bg-gray-700 rounded h-4 relative">
							<div
								class="bg-blue-500 h-4 rounded duration-100 transition-all"
								style="width: {video.progress}%;"
							></div>
							<div class="absolute inset-0 flex items-center justify-center text-sm text-white">
								{video.progress}%
							</div>
						</div>
					</section>
				</div>
			</div>
		{/each}
	{/if}
</div>

<style>
	.grid-cols-2-template {
		grid-template-columns: 30% 70%;
	}
</style>

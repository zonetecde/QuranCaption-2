<script lang="ts">
	import { currentlyExportingVideos } from '$lib/stores/ExportStore';
	import { onMount } from 'svelte';
	import { listen } from '@tauri-apps/api/event';

	onMount(async () => {
		// Écouter l'événement émis par createOrUpdateExportDetailsWindow
		const unlisten = await listen('updateExportDetails', (event) => {
			//@ts-ignore
			currentlyExportingVideos.set(event.payload.currentlyExportingVideos);
			console.log($currentlyExportingVideos);
		});
	});
</script>

<div class="h-screen min-h-[1080px] flex flex-col overflow-x-hidden" id="container">
	{#if $currentlyExportingVideos.length > 0}
		{#each $currentlyExportingVideos as video}
			<div class="flex items-center justify-center h-full">
				<div class="text-2xl">Exporting video {video.exportId}</div>
				<div class="text-2xl">Status: {video.status}</div>
			</div>
		{/each}
	{:else}
		<div class="flex items-center justify-center h-full">
			<div class="text-2xl">No videos are currently being exported</div>
		</div>
	{/if}
</div>

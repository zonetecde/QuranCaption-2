<script lang="ts">
	import { onDestroy, onMount } from 'svelte';
	import { listen } from '@tauri-apps/api/event';
	import { getExportPath } from '$lib/ext/LocalStorageWrapper';
	import type { VideoExportStatus } from '$lib/stores/ExportStore';
	import TitleBar from './TitleBar.svelte';
	import { invoke } from '@tauri-apps/api/tauri';

	let listeners: any[] = [];
	let currentlyExportingVideos: VideoExportStatus[] = [];

	onMount(async () => {
		// à la création, donne dans l'url en JSON du projet en cours (la raison pour laquelle on a ouvert la fenetre d'export)
		const project = window.location.search.split('?')[1];
		if (project) {
			const projectData = JSON.parse(decodeURIComponent(project));
			currentlyExportingVideos = [projectData, ...currentlyExportingVideos];
		}

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

				//@ts-ignore
				if (event.payload.status === 'Exported') {
					// ouvre le dossier de l'export
					setTimeout(() => {
						invoke('open_file_dir', { path: currentlyExportingVideos[index].outputPath });
					}, 1000);
				}
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

	// convertis une chaine longue en une chaine courte avec `...` au milieu
	function formatPath(path: string) {
		const maxLength = 50; // Longueur maximale de la chaîne
		if (path.length > maxLength) {
			const start = path.slice(0, 20); // Prend les 20 premiers caractères
			const end = path.slice(-40); // Prend les 20 derniers caractères
			return `${start}...${end}`; // Concatène les deux parties avec "..."
		}
		return path; // Si la chaîne est courte, retourne-la telle quelle
	}
</script>

<TitleBar />
<div
	class="pt-14 h-screen flex flex-col overflow-x-hidden bg-[#242222] px-4 py-4 gap-y-3"
	id="container"
>
	{#if currentlyExportingVideos.length > 0}
		{#each currentlyExportingVideos as video}
			<div class="border rounded-xl border-[#3b3b3b] bg-[#2a2a2a] p-4 flex flex-col gap-y-2">
				<div class="text-sm flex">
					<p class="text-[1rem] font-bold">
						{video.projectName}
					</p>
					<!-- portrait mode on the right corner -->
					<p class="text-[1rem] ml-auto">
						{video.portrait ? 'Portrait' : 'Landscape'}
					</p>
				</div>

				<div class="grid grid-cols-2-template mt-1">
					<section class="flex flex-col w-full">
						<div class="text-sm font-bold">
							Status: {video.status}
						</div>
					</section>
					<section class="flex flex-col ml-4">
						{#if video.status !== 'Exported'}
							<div class="w-full bg-gray-700 rounded h-4 relative mt-0.5">
								<div
									class="bg-blue-500 h-4 rounded duration-100 transition-all"
									style="width: {video.progress}%;"
								></div>
								<div class="absolute inset-0 flex items-center justify-center text-sm text-white">
									{video.progress}%
								</div>
							</div>
						{/if}
					</section>
				</div>

				{#if video.status === 'Exported'}
					<button
						class="text-xs mt-1 text-left"
						on:click={() => invoke('open_file_dir', { path: video.outputPath })}
					>
						<u>Output file:</u>
						{formatPath(video.outputPath)}<br />
						<span class="text-gray-500">Click to open the file's directory</span>
					</button>
				{/if}
			</div>
		{/each}
	{/if}
</div>

<style>
	.grid-cols-2-template {
		grid-template-columns: 30% 70%;
	}
</style>

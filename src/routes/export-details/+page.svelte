<script lang="ts">
	import { onDestroy, onMount } from 'svelte';
	import { listen } from '@tauri-apps/api/event';
	import {
		getExportPath,
		initializeStorage,
		localStorageWrapper
	} from '$lib/ext/LocalStorageWrapper';
	import type { VideoExportStatus } from '$lib/stores/ExportStore';
	import TitleBar from './TitleBar.svelte';
	import { invoke } from '@tauri-apps/api/tauri';
	import { WebviewWindow } from '@tauri-apps/api/window';
	import { generateOutputPath, isVideoExportFinished } from '$lib/functions/ExportProject';

	let listeners: any[] = [];
	let currentlyExportingVideos: VideoExportStatus[] = [];

	onMount(async () => {
		await initializeStorage();

		// récupère les exports en cours
		const storedExports = await localStorageWrapper.getItem('exportedVideoDetails');
		if (storedExports) {
			currentlyExportingVideos = storedExports;

			// vérifie qu'ils sont tous soit exported soit cancelled, sinon leur status est mis à cancelled
			currentlyExportingVideos = currentlyExportingVideos.map((video) => {
				if (isVideoExportFinished(video)) {
					return video;
				} else {
					video.status = 'Cancelled';
					return video;
				}
			});
		}

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
			//@ts-ignore
			const index = currentlyExportingVideos.findIndex(
				//@ts-ignore
				(video) => video.exportId === event.payload.exportId
			);
			if (index !== -1) {
				//@ts-ignore
				console.log('updateExportDetailsById', event.payload.status + ' ' + event.payload.progress);

				if (currentlyExportingVideos[index].status === 'Cancelled') {
					// refait un cancel export pour être sûre
					cancelExport(currentlyExportingVideos[index]);

					return; // il se peut qu'un % vienne après le cancel donc l'en empêche
				}

				//@ts-ignore
				currentlyExportingVideos[index].status = event.payload.status;
				//@ts-ignore
				currentlyExportingVideos[index].progress = event.payload.progress;
			}
		});
		listeners.push(l2);

		const l3 = await listen('updateVersesRangeById', (event) => {
			//@ts-ignore
			const index = currentlyExportingVideos.findIndex(
				//@ts-ignore
				(video) => video.exportId === event.payload.exportId
			);
			if (index !== -1) {
				//@ts-ignore
				currentlyExportingVideos[index].selectedVersesRange = event.payload.selectedVersesRange;
				//@ts-ignore
				currentlyExportingVideos[index].outputPath = generateOutputPath(
					currentlyExportingVideos[index]
				);
			}
		});
		listeners.push(l3);
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

	async function cancelExport(video: VideoExportStatus) {
		if (video.status === 'Capturing video frames...') {
			video.status = 'Cancelling...';

			// ferme la fenetre d'export
			const exportDetailsWindow = WebviewWindow.getByLabel(video.exportId.toString());
			if (exportDetailsWindow) {
				await exportDetailsWindow.close();
				video.status = 'Cancelled';
			}
		} else {
			video.status = 'Cancelling...';

			await invoke('cancel_export', { exportId: video.exportId });
		}
	}

	$: if (currentlyExportingVideos && currentlyExportingVideos.length > 0) {
		// save dans le local storage
		localStorageWrapper.setItem('exportedVideoDetails', currentlyExportingVideos);
	}
</script>

<TitleBar />
<div
	class="pt-14 h-screen flex flex-col overflow-x-hidden bg-[#242222] px-4 py-4 gap-y-3"
	id="container"
>
	{#if currentlyExportingVideos.length > 0}
		{#each currentlyExportingVideos as video}
			<div
				class="border rounded-xl border-[#3b3b3b] bg-[#2a2a2a] p-4 flex flex-col gap-y-2 relative"
			>
				<div class="text-sm flex">
					<p class="text-[1rem] font-bold">
						{video.projectName}<br />
					</p>

					<!-- portrait mode on the right corner -->
					<p class="text-[1rem] ml-auto text-sm text-right">
						{video.portrait ? 'Portrait' : 'Landscape'} - {new Date(video.date).toLocaleString(
							'en-GB',
							{
								day: '2-digit',
								month: '2-digit',
								year: 'numeric',
								hour: '2-digit',
								minute: '2-digit'
							}
						)}

						<br />
						<span class="text-xs font-normal">{video.selectedVersesRange || ''}</span>
					</p>
				</div>

				<div class="grid grid-cols-2-template mt-1">
					<section class="flex flex-col w-full">
						<div class="text-sm font-bold">
							<div class="flex items-center gap-x-2">
								Status: {video.status}
							</div>
						</div>
					</section>
					<section class="flex flex-col ml-4">
						{#if isVideoExportFinished(video) === false}
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
				{:else if video.status !== 'Cancelled' && video.status !== 'Cancelling...'}
					<!-- cancel export butto n -->
					<button
						class="ml-auto bg-[#8b2f2f] px-2 rounded-md border border-[#492020] mt-1 text-left"
						on:click={() => cancelExport(video)}
					>
						Cancel export
					</button>
				{/if}

				{#if video.status === 'Exported' || video.status === 'Cancelled'}
					<button
						class="absolute bottom-0 right-0 ml-auto bg-[#8b2f2f9a] px-1 py-1 rounded-br-xl rounded-tl-md border border-[#492020] mt-1 text-left"
						on:click={() => {
							currentlyExportingVideos = currentlyExportingVideos.filter(
								(v) => v.exportId !== video.exportId
							);
						}}
					>
						<svg
							xmlns="http://www.w3.org/2000/svg"
							fill="none"
							viewBox="0 0 24 24"
							stroke-width="1.5"
							stroke="currentColor"
							class="size-6"
						>
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0"
							/>
						</svg>
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

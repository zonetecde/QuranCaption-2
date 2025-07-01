<script lang="ts">
	import { globalState } from '$lib/runes/main.svelte';
	import { mount, onDestroy, onMount } from 'svelte';
	import AssetViewer from './AssetViewer.svelte';
	import { getCurrentWebview } from '@tauri-apps/api/webview';
	import DropOverlay from './DropOverlay.svelte';

	let unlisten: () => void;
	let dropZone: HTMLDivElement;

	onMount(async () => {
		unlisten = await getCurrentWebview().onDragDropEvent((event) => {
			if (event.payload.type === 'over') {
				if (!globalState.projectEditorState.showDropScreen)
					globalState.projectEditorState.showDropScreen = true;
			} else if (event.payload.type === 'drop') {
				if (globalState.projectEditorState.showDropScreen) {
					globalState.projectEditorState.showDropScreen = false;
					// Ajoute le(s) fichier(s) au projet
					for (const file of event.payload.paths) {
						globalState.currentProject?.content.addAsset(file);
					}
				}
			} else {
				if (globalState.projectEditorState.showDropScreen)
					globalState.projectEditorState.showDropScreen = false;
			}
		});
	});

	$effect(() => {
		if (globalState.projectEditorState.showDropScreen) {
			const container = document.createElement('div');
			container.id = 'drop-overlay-container';
			document.body.appendChild(container);

			// Monter le composant Svelte 5
			const input = mount(DropOverlay, {
				target: container
			});

			return () => {
				container.remove();
			};
		}
	});

	onDestroy(() => {
		unlisten();
	});
</script>

<div class="flex" bind:this={dropZone}>
	<h3 class="text-sm font-semibold text-gray-100 flex items-center">
		<span class="material-icons mr-2 text-lg text-indigo-400">folder_open</span>Project Assets
	</h3>
	<!-- dropdownicon -->
	<button class="flex items-center ml-auto cursor-pointer rotate-180">
		<span class="material-icons text-4xl! text-indigo-400">arrow_drop_down</span>
	</button>
</div>

<button
	class="w-full flex items-center justify-center bg-indigo-600 hover:bg-indigo-700 text-white py-2 px-3 rounded-md text-sm mt-2 cursor-pointer transition-colors duration-200"
	type="button"
>
	<span class="material-icons mr-2 text-base">add_circle_outline</span>Add Asset
</button>

<div class="flex flex-col gap-2 mt-2">
	{#each globalState.currentProject!.content.assets as asset}
		<AssetViewer {asset} />
	{/each}
</div>

<div class="text-center text-xs text-gray-500 pt-2 mt-2">Drag and drop files here</div>

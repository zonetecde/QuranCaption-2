<script lang="ts">
	import type { SubtitleClip } from '$lib/models/Timeline';
	import { onMount } from 'svelte';
	import { cursorPosition, scrollToCursor, zoom } from '$lib/stores/TimelineStore';
	import { generateRandomBrightColorBasedOnSeed } from '$lib/ext/Color';
	import { getVerse, Mushaf } from '$lib/stores/QuranStore';
	import { isPreviewPlaying } from '$lib/stores/VideoPreviewStore';
	import { spaceBarPressed } from '$lib/stores/ShortcutStore';
	import toast from 'svelte-french-toast';
	import {
		clearSubtitleToEdit,
		currentlyEditedSubtitleId,
		currentPage,
		setCurrentVideoTime,
		setSubtitleToEdit
	} from '$lib/stores/LayoutStore';
	import ContextMenu, { Item, Divider, Settings } from 'svelte-contextmenu';

	export let clip: SubtitleClip;
	let color: string = '#7cce79';

	function handleClipRightClicked(e: MouseEvent): void {
		myMenu.createHandler();
		myMenu.show(e);
	}

	async function handleClipClicked(e: any) {
		if ($currentPage === 'Video editor') {
			if ($isPreviewPlaying)
				// move the cursor to the start of the clip
				setCurrentVideoTime.set(clip.start / 1000);
			else {
				cursorPosition.set(clip.start + 1);
			}
		} else if ($currentPage === 'Subtitles editor') {
			if ($isPreviewPlaying) {
				toast.error('Stop the video to edit a subtitle');
				return;
			}

			if ($currentlyEditedSubtitleId === clip.id) {
				clearSubtitleToEdit();
			} else {
				setSubtitleToEdit(clip.id);
				color = '#655429';
			}
		}
	}

	$: if (!$currentlyEditedSubtitleId || $currentlyEditedSubtitleId !== clip.id) {
		if ($Mushaf)
			// Si on sort du mode édition, on remet la couleur par défaut
			color = generateRandomBrightColorBasedOnSeed(getVerse(clip.surah, clip.verse).text);
	}

	onMount(async () => {
		// Wait for the Mushaf to be loaded (needed for the color generation)
		while (!$Mushaf) {
			await new Promise((resolve) => setTimeout(resolve, 100));
		}

		color = generateRandomBrightColorBasedOnSeed(getVerse(clip.surah, clip.verse).text);
	});

	let myMenu: ContextMenu;

	function handleEditSubtitleButtonClicked(e: MouseEvent): void {
		setSubtitleToEdit(clip.id);
		color = '#655429';
		myMenu.$destroy();
	}
</script>

<!-- svelte-ignore a11y-click-events-have-key-events -->
<!-- svelte-ignore a11y-no-static-element-interactions -->
<div
	class={`h-full border-r-2 border-[#1d1b1b] text-black flex items-center justify-center overflow-hidden relative cursor-pointer`}
	on:click={handleClipClicked}
	on:contextmenu={handleClipRightClicked}
	style="width: {($zoom * (clip.end - clip.start)) / 1000}px;
	background-color: {color}"
>
	<p class="arabic text-right px-3">
		{clip.isSilence ? 'silence' : clip.isCustomText ? 'Custom Text' : clip.text}
	</p>
</div>

<ContextMenu bind:this={myMenu}>
	<Item on:click={handleEditSubtitleButtonClicked}>
		<div class="flex flex-row items-center gap-x-2">
			<svg
				xmlns="http://www.w3.org/2000/svg"
				fill="none"
				viewBox="0 0 24 24"
				stroke-width="1.5"
				stroke="currentColor"
				class="w-6 h-6"
			>
				<path
					stroke-linecap="round"
					stroke-linejoin="round"
					d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L6.832 19.82a4.5 4.5 0 0 1-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 0 1 1.13-1.897L16.863 4.487Zm0 0L19.5 7.125"
				/>
			</svg>
			<p>Edit</p>
		</div></Item
	>
</ContextMenu>

<style>
	.largerCheckbox {
		width: 14px;
		height: 14px;
	}
</style>

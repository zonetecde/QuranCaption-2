<script lang="ts">
	import { generateRandomBrightColorBasedOnSeed } from '$lib/ext/Color';
	import type { SubtitleClip } from '$lib/models/Timeline';
	import {
		clearSubtitleToEdit,
		currentlyCustomizedSubtitleId,
		currentlyEditedSubtitleId,
		currentPage,
		selectedSubtitlesLanguage,
		setCurrentVideoTime,
		setSubtitleToEdit,
		videoEditorSelectedTab
	} from '$lib/stores/LayoutStore';
	import { currentProject, hasSubtitleAtLeastOneStyle } from '$lib/stores/ProjectStore';
	import { getVerse, Mushaf } from '$lib/stores/QuranStore';
	import { cursorPosition, zoom } from '$lib/stores/TimelineStore';
	import { isPreviewPlaying } from '$lib/stores/VideoPreviewStore';
	import { onMount } from 'svelte';
	import ContextMenu, { Item } from 'svelte-contextmenu';
	import toast from 'svelte-french-toast';

	export let clip: SubtitleClip;
	let color = '#7cce79';

	function handleClipRightClicked(e: MouseEvent): void {
		if (clip.verse === -1 || clip.surah === -1) return;

		myMenu.createHandler();
		myMenu.show(e);
	}

	async function handleClipClicked(e: any) {
		if ($currentPage === 'Video editor' || $currentPage === 'Export') {
			if ($isPreviewPlaying)
				// move the cursor to the start of the clip
				setCurrentVideoTime.set(clip.start / 1000);
			else {
				const temp = $currentProject.projectSettings.globalSubtitlesSettings.fadeDuration;
				if (temp !== 0) {
					$currentProject.projectSettings.globalSubtitlesSettings.fadeDuration = 0;
					setTimeout(() => {
						$currentProject.projectSettings.globalSubtitlesSettings.fadeDuration = temp;
					}, 0);
					cursorPosition.set(clip.start + 1);
				}
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
		myMenu.$destroy();
	}

	async function customizeStyleButtonClicked(e: MouseEvent) {
		// Si on est sur la page Video Editor, on affiche les paramètres de cette page :
		if ($currentPage === 'Video editor') {
			await new Promise((resolve) => setTimeout(resolve, 10));

			videoEditorSelectedTab.set('subtitles settings');

			await new Promise((resolve) => setTimeout(resolve, 100));

			selectedSubtitlesLanguage.set('individual');

			// UI Update
			await new Promise((resolve) => setTimeout(resolve, 10));

			// scroll to the individual subtitle settings
			currentlyCustomizedSubtitleId.set(clip.id);
		} else {
			// Sinon si on est sur la page Subtitles Editor, on affiche les paramètres de cette page : (panel de droite)
			currentlyCustomizedSubtitleId.set(clip.id); // va trigger le hook
		}
	}
</script>

<!-- svelte-ignore a11y-click-events-have-key-events -->
<!-- svelte-ignore a11y-no-static-element-interactions -->
<div
	class={`h-full border-r-2 border-[#1d1b1b] text-black flex items-center justify-center overflow-hidden relative cursor-pointer`}
	on:click={handleClipClicked}
	on:contextmenu={handleClipRightClicked}
	style="width: {($zoom * (clip.end - clip.start)) / 1000}px;
	background-color: {$currentlyEditedSubtitleId === clip.id ? '#655429' : color}"
>
	<p class="arabic text-right px-3">
		{clip.isSilence ? 'silence' : clip.isCustomText ? 'Custom Text' : clip.text}
	</p>

	{#if hasSubtitleAtLeastOneStyle(clip.id)}
		<svg
			xmlns="http://www.w3.org/2000/svg"
			fill="none"
			viewBox="0 0 24 24"
			stroke-width="1.5"
			stroke="currentColor"
			class="size-5 absolute top-0.5 right-0.5 bg-[#43ff3d4d] rounded-full border p-0.5 border-[#1e381dd8]"
		>
			<path
				stroke-linecap="round"
				stroke-linejoin="round"
				d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 0 0-2.456 2.456ZM16.894 20.567 16.5 21.75l-.394-1.183a2.25 2.25 0 0 0-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 0 0 1.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 0 0 1.423 1.423l1.183.394-1.183.394a2.25 2.25 0 0 0-1.423 1.423Z"
			/>
		</svg>{/if}
</div>

<ContextMenu bind:this={myMenu}>
	{#if clip.verse !== -1 && clip.surah !== -1}
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
	{/if}
	{#if !clip.isSilence}
		<Item on:click={customizeStyleButtonClicked}>
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
						d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 0 0-2.456 2.456ZM16.894 20.567 16.5 21.75l-.394-1.183a2.25 2.25 0 0 0-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 0 0 1.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 0 0 1.423 1.423l1.183.394-1.183.394a2.25 2.25 0 0 0-1.423 1.423Z"
					/>
				</svg>

				<p>Customize style</p>
			</div></Item
		>
	{/if}
</ContextMenu>

<style>
	.largerCheckbox {
		width: 14px;
		height: 14px;
	}
</style>

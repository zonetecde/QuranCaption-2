<script lang="ts">
	import type { SubtitleClip } from '$lib/models/Timeline';
	import { onMount } from 'svelte';
	import { cursorPosition, scrollToCursor, zoom } from '$lib/stores/TimelineStore';
	import { generateRandomBrightColorBasedOnSeed } from '$lib/ext/Color';
	import { getVerse, Mushaf } from '$lib/stores/QuranStore';
	import { isPreviewPlaying } from '$lib/stores/VideoPreviewStore';
	import { spaceBarPressed } from '$lib/stores/ShortcutStore';
	import toast from 'svelte-french-toast';
	import { currentlyEditedSubtitleId, currentPage } from '$lib/stores/LayoutStore';

	export let clip: SubtitleClip;
	let color: string = '#7cce79';

	async function handleClipClicked(e: any) {
		if (e.button === 2) {
			// Possibility to add effects
		} else {
			if ($currentPage === 'Video editor') {
				if ($isPreviewPlaying) {
					toast.error('Stop the video to navigate to a subtitle');
					return;
				}
				// move the cursor to the start of the clip
				cursorPosition.set(clip.start + 1);
			} else if ($currentPage === 'Subtitles editor') {
				if ($isPreviewPlaying) {
					toast.error('Stop the video to edit a subtitle');
					return;
				}

				if ($currentlyEditedSubtitleId === clip.id) {
					currentlyEditedSubtitleId.set(undefined);
				} else {
					currentlyEditedSubtitleId.set(clip.id);

					color = '#655429';
				}
			}
		}
	}

	$: if (!$currentlyEditedSubtitleId || $currentlyEditedSubtitleId !== clip.id) {
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
</script>

<!-- svelte-ignore a11y-click-events-have-key-events -->
<!-- svelte-ignore a11y-no-static-element-interactions -->
<div
	class={`h-full border-r-2 border-[#1d1b1b] text-black flex items-center justify-center overflow-hidden relative cursor-pointer`}
	on:mousedown={handleClipClicked}
	style="width: {($zoom * (clip.end - clip.start)) / 1000}px;
	background-color: {color}"
>
	<p class="arabic text-right px-3">
		{clip.isSilence ? 'silence' : clip.isCustomText ? 'Custom Text' : clip.text}
	</p>
</div>

<script lang="ts">
	import type { SubtitleClip } from '$lib/models/Timeline';
	import { onMount } from 'svelte';
	import { cursorPosition, scrollToCursor, zoom } from '$lib/stores/TimelineStore';
	import { generateRandomBrightColorBasedOnSeed } from '$lib/ext/Color';
	import { getVerse, Mushaf } from '$lib/stores/QuranStore';
	import { isPreviewPlaying } from '$lib/stores/VideoPreviewStore';
	import { spaceBarPressed } from '$lib/stores/ShortcutStore';
	import toast from 'svelte-french-toast';

	export let clip: SubtitleClip;
	let color: string = '#7cce79';

	async function handleClipClicked() {
		if ($isPreviewPlaying) {
			toast.error('Stop the video to navigate to a subtitle');
			return;
		}
		// move the cursor to the start of the clip
		cursorPosition.set(clip.start + 1);
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
	class={`h-full border-r-2 border-[#1d1b1b] text-black flex items-center justify-center overflow-hidden relative`}
	on:click={handleClipClicked}
	style="width: {($zoom * (clip.end - clip.start)) / 1000}px;
	background-color: {color}"
>
	<p class="arabic text-right px-3">
		{clip.isSilence ? 'silence' : clip.isCustomText ? 'Custom Text' : clip.text}
	</p>
</div>

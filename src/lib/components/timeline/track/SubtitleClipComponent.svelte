<script lang="ts">
	import type { SubtitleClip } from '$lib/models/Timeline';
	import { onMount } from 'svelte';
	import { zoom } from '$lib/stores/TimelineStore';
	import { generateRandomBrightColorBasedOnSeed } from '$lib/ext/Color';
	import { getVerse } from '$lib/stores/QuranStore';

	export let clip: SubtitleClip;
	let color: string = '#7cce79';

	function handleClipClicked() {}

	onMount(() => {
		color = generateRandomBrightColorBasedOnSeed(getVerse(clip.surah, clip.verse).text);
		console.log(color);
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

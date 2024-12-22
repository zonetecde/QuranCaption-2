<script lang="ts">
	import type { SubtitleClip } from '$lib/models/Timeline';
	import { onMount } from 'svelte';
	import { zoom } from '$lib/stores/TimelineStore';

	export let clip: SubtitleClip;

	function handleClipClicked() {}
</script>

<!-- svelte-ignore a11y-click-events-have-key-events -->
<!-- svelte-ignore a11y-no-static-element-interactions -->
<div
	class="h-full border-r-2 border-[#1d1b1b] bg-[#7cce79] text-black flex items-center justify-center overflow-hidden relative"
	on:click={handleClipClicked}
	style="width: {($zoom * (clip.end - clip.start)) / 1000}px;"
>
	<p class="arabic text-right">
		{clip.isSilence ? 'silence' : clip.isCustomText ? 'Custom Text' : clip.text}
	</p>
</div>

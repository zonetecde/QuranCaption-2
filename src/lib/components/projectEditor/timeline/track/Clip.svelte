<script lang="ts">
	import { TrackType, type AssetClip, type Clip, type Track } from '$lib/classes';
	import { globalState } from '$lib/runes/main.svelte';
	import { convertFileSrc } from '@tauri-apps/api/core';
	import { onMount } from 'svelte';
	import { fade } from 'svelte/transition';
	import WaveSurfer from 'wavesurfer.js';

	let {
		clip = $bindable(),
		track = $bindable()
	}: {
		clip: Clip;
		track: Track;
	} = $props();

	let positionLeft = $derived(() => {
		return (clip.startTime / 1000) * track.getPixelPerSecond();
	});

	let asset = globalState.currentProject?.content.getAsset((clip as AssetClip).assetId)!;
	let file = $state(convertFileSrc(asset.filePath));

	onMount(async () => {
		await new Promise((resolve) => setTimeout(resolve, 0));
		const wavesurfer = WaveSurfer.create({
			container: '#clip-' + clip.id,
			waveColor: '#4F4A85',
			progressColor: '#383351',
			url: file,
			height: 'auto'
		});
	});
</script>

<div
	class="absolute top-0 left-0 h-full"
	id={'clip-' + clip.id}
	style="width: {clip.getWidth()}px; left: {positionLeft()}px;"
>
	{#if track.type === TrackType.Video}
		<div class="absolute inset-0 bg-black z-5 flex overflow-hidden"></div>
	{/if}
</div>

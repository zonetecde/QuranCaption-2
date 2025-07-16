<script lang="ts">
	import type { AssetClip, Clip, Track } from '$lib/classes';
	import { globalState } from '$lib/runes/main.svelte';
	import { convertFileSrc } from '@tauri-apps/api/core';
	import { onMount } from 'svelte';
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

	onMount(() => {
		const wavesurfer = WaveSurfer.create({
			container: '#audio-' + clip.id,
			waveColor: '#4F4A85',
			progressColor: '#383351',
			url: file,
			height: 'auto'
		});

		wavesurfer.on('interaction', () => {
			wavesurfer.play();
		});
	});
</script>

<div
	class="absolute top-0 left-0 h-full border"
	id={'audio-' + clip.id}
	style="width: {clip.getWidth()}px; left: {positionLeft()}px;"
></div>

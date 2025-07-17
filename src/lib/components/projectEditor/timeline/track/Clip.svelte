<script lang="ts">
	import { TrackType, type AssetClip, type Clip, type Track } from '$lib/classes';
	import { globalState } from '$lib/runes/main.svelte';
	import { convertFileSrc } from '@tauri-apps/api/core';
	import { onMount } from 'svelte';
	import { fade, slide } from 'svelte/transition';
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

	let asset = globalState.currentProject?.content.getAssetById((clip as AssetClip).assetId)!;
	let file = $state(convertFileSrc(asset.filePath));

	$effect(() => {
		if (
			globalState.currentProject?.projectEditorState.timeline.showWaveforms &&
			track.type === TrackType.Audio
		) {
			const wavesurfer = WaveSurfer.create({
				container: '#clip-' + clip.id,
				waveColor: '#9d99cc',
				progressColor: '#9d99cc',
				url: file,
				height: 'auto'
			});
		}
	});
</script>

<div
	class="absolute inset-0 z-10 border border-[var(--timeline-clip-border)] bg-[var(--timeline-clip-color)] rounded-md group"
	style="width: {clip.getWidth()}px; left: {positionLeft()}px;"
	transition:slide={{ duration: 500, axis: 'x' }}
>
	{#if globalState.currentProject?.projectEditorState.timeline.showWaveforms && track.type === TrackType.Audio}
		<div class="h-full w-full" id={'clip-' + clip.id}></div>
	{:else}
		<div class="absolute inset-0 z-5 flex overflow-hidden px-2 py-2">
			<span class="text-xs text-[var(--text-secondary)] font-medium">{asset.fileName}</span>
		</div>
	{/if}

	<section class="absolute bottom-0.5 left-0.5 z-5">
		<!-- delete clip -->
		<button
			class="text-[var(--text-secondary)] text-sm cursor-pointer opacity-0 group-hover:opacity-100"
			onclick={() => track.removeClip(clip.id)}
		>
			<span class="material-icons">delete</span>
		</button>
	</section>
</div>

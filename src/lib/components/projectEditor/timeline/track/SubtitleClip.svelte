<script lang="ts">
	import { SubtitleClip, TrackType, type AssetClip, type Clip, type Track } from '$lib/classes';
	import { globalState } from '$lib/runes/main.svelte';
	import { convertFileSrc } from '@tauri-apps/api/core';
	import { onMount } from 'svelte';
	import { fade, slide } from 'svelte/transition';
	import WaveSurfer from 'wavesurfer.js';

	let {
		clip = $bindable(),
		track = $bindable()
	}: {
		clip: SubtitleClip;
		track: Track;
	} = $props();

	let positionLeft = $derived(() => {
		return (clip.startTime / 1000) * track.getPixelPerSecond();
	});

	let dragStartX: number | null = null;

	function startLeftDragging(e: MouseEvent) {
		// vient de cliquer sur le bord gauche du clip
		dragStartX = e.clientX;
		globalState.currentProject!.projectEditorState.timeline.showCursor = false;
		document.addEventListener('mousemove', onLeftDragging);
		document.addEventListener('mouseup', stopLeftDragging);
	}

	function onLeftDragging(e: MouseEvent) {
		if (dragStartX === null) return;

		clip.updateStartTime(globalState.currentProject?.projectEditorState.timeline.cursorPosition!);
	}

	function stopLeftDragging() {
		dragStartX = null;
		document.removeEventListener('mousemove', onLeftDragging);
		document.removeEventListener('mouseup', stopLeftDragging);
		globalState.currentProject!.projectEditorState.timeline.showCursor = true;
	}

	function startRightDragging(e: MouseEvent) {
		// vient de cliquer sur le bord droit du clip
		dragStartX = e.clientX;
		document.addEventListener('mousemove', onRightDragging);
		document.addEventListener('mouseup', stopRightDragging);
		globalState.currentProject!.projectEditorState.timeline.showCursor = false;
	}

	function onRightDragging(e: MouseEvent) {
		if (dragStartX === null) return;

		clip.updateEndTime(globalState.currentProject?.projectEditorState.timeline.cursorPosition!);
	}

	function stopRightDragging() {
		dragStartX = null;
		document.removeEventListener('mousemove', onRightDragging);
		document.removeEventListener('mouseup', stopRightDragging);
		globalState.currentProject!.projectEditorState.timeline.showCursor = true;
	}
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
			<span class="text-xs text-[var(--text-secondary)] font-medium">{clip.text}</span>
		</div>
	{/if}

	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div
		class="h-full w-1 left-0 cursor-w-resize absolute top-0 bottom-0 z-10"
		onmousedown={startLeftDragging}
	></div>

	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div
		class="h-full w-1 right-0 cursor-w-resize absolute top-0 bottom-0 z-10"
		onmousedown={startRightDragging}
	></div>
</div>

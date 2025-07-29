<script lang="ts">
	import { SubtitleClip, TrackType, type AssetClip, type Clip, type Track } from '$lib/classes';
	import { globalState } from '$lib/runes/main.svelte';
	import { fade, slide } from 'svelte/transition';
	import ContextMenu, { Item, Divider, Settings } from 'svelte-contextmenu';

	let {
		clip = $bindable(),
		track = $bindable()
	}: {
		clip: SubtitleClip;
		track: Track;
	} = $props();

	let contextMenu: ContextMenu | undefined = $state(undefined); // Initialize context menu state

	let positionLeft = $derived(() => {
		return (clip.startTime / 1000) * track.getPixelPerSecond();
	});

	let dragStartX: number | null = null;

	function startLeftDragging(e: MouseEvent) {
		if (e.button === 0) {
			// vient de cliquer sur le bord gauche du clip
			dragStartX = e.clientX;
			globalState.currentProject!.projectEditorState.timeline.showCursor = false;
			document.addEventListener('mousemove', onLeftDragging);
			document.addEventListener('mouseup', stopLeftDragging);
		}
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

	function addSilence(): void {
		// Ajoute un silence à gauche du clip
		track.addSilence(clip.id);
	}

	function removeSubtitle(): void {
		// Supprime le clip de sous-titre
		// Le setTimeout est nécessaire sinon le contextmenu ne se ferme pas
		setTimeout(() => {
			track.removeClip(clip.id, true);
		}, 0);
	}
</script>

<div
	class="absolute inset-0 z-10 border border-[var(--timeline-clip-border)] bg-[var(--timeline-clip-color)] rounded-md group overflow-hidden"
	style="width: {clip.getWidth()}px; left: {positionLeft()}px;"
	transition:slide={{ duration: 500, axis: 'x' }}
	oncontextmenu={(e) => {
		e.preventDefault();
		contextMenu!.show(e);
	}}
>
	{#if clip.type === 'Subtitle' || clip.type === 'Pre-defined Subtitle'}
		<div class="absolute inset-0 z-5 flex px-2 py-2">
			<span class="text-xs text-[var(--text-secondary)] font-medium mx-auto my-auto" dir="rtl"
				>{clip.text}</span
			>
		</div>
	{:else if clip.type === 'Silence'}
		<div
			class="absolute inset-0 z-5 flex px-2 py-2"
			style="background: repeating-linear-gradient(45deg, transparent 0px, transparent 8px, var(--timeline-clip-color) 8px, var(--timeline-clip-color) 16px);"
		></div>
	{/if}

	<div
		class="h-full w-1 left-0 cursor-w-resize absolute top-0 bottom-0 z-10"
		onmousedown={startLeftDragging}
	></div>

	<div
		class="h-full w-1 right-0 cursor-w-resize absolute top-0 bottom-0 z-10"
		onmousedown={startRightDragging}
	></div>
</div>

<ContextMenu bind:this={contextMenu}>
	<Item on:click={addSilence}
		><div class="btn-icon">
			<span class="material-icons-outlined text-sm mr-1">space_bar</span>Add silence (on the left)
		</div></Item
	>
	<Item on:click={removeSubtitle}
		><div class="btn-icon">
			<span class="material-icons-outlined text-sm mr-1">remove</span>Remove subtitle
		</div></Item
	>
</ContextMenu>

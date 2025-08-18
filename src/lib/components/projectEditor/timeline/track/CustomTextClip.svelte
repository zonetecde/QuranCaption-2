<script lang="ts">
	import { CustomTextClip, TrackType, type AssetClip, type Clip, type Track } from '$lib/classes';
	import { globalState } from '$lib/runes/main.svelte';
	import { fade, slide } from 'svelte/transition';
	import ContextMenu, { Item, Divider, Settings } from 'svelte-contextmenu';

	let {
		clip = $bindable(),
		track = $bindable()
	}: {
		clip: CustomTextClip;
		track: Track;
	} = $props();

	let positionLeft = $derived(() => {
		// Si le custom text est visible sur toute la vidéo, alors on le commence au début.
		return clip.getAlwaysShow() ? 0 : (clip.startTime / 1000) * track.getPixelPerSecond();
	});

	let contextMenu: ContextMenu | null = null;

	function removeClip(e: MouseEvent): void {
		setTimeout(() => {
			track.removeClip(clip.id);
		});
	}
</script>

<div
	class="absolute inset-0 z-10 border border-[var(--timeline-clip-border)] bg-[var(--timeline-clip-color)] rounded-md group"
	style="width: {clip.getWidth()}px; left: {positionLeft()}px;"
	transition:slide={{ duration: 500, axis: 'x' }}
	oncontextmenu={(e) => {
		e.preventDefault();
		contextMenu!.show(e);
	}}
>
	<div class="absolute inset-0 z-5 flex overflow-hidden px-2 py-2">
		<div class="flex items-center w-full">
			<span class="text-xs text-[var(--text-secondary)] font-medium">{clip.getText()}</span>
		</div>
	</div>

	<section class="absolute bottom-0.5 left-0.5 z-5">
		<!-- delete clip -->
		<button
			class="text-[var(--text-secondary)] text-sm cursor-pointer opacity-0 group-hover:opacity-100"
			onclick={removeClip}
		>
			<span class="material-icons">delete</span>
		</button>
	</section>
</div>

<ContextMenu bind:this={contextMenu}>
	<Item on:click={removeClip}
		><div class="btn-icon">
			<span class="material-icons-outlined text-sm mr-1">remove</span>Remove Custom Text
		</div></Item
	>
</ContextMenu>

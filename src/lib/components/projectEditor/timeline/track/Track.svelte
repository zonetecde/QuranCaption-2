<script lang="ts">
	import {
		TrackType,
		type AssetType,
		type Track,
		type SubtitleClip as SubtitleClipType,
		Clip,
		SubtitleClip
	} from '$lib/classes';
	import { globalState } from '$lib/runes/main.svelte';
	import ClipComponent from './Clip.svelte';
	import SubtitleClipComponent from './SubtitleClip.svelte';
	import CustomClipComponent from './CustomClip.svelte';
	import { SubtitleTrack } from '$lib/classes/Track.svelte';
	import { CustomClip } from '$lib/classes/Clip.svelte';

	let {
		track = $bindable()
	}: {
		track: Track;
	} = $props();
</script>

<div
	class="flex-1 min-h-[75px] border-b border-[var(--timeline-track-border)] relative select-none"
	style="background: linear-gradient(90deg, var(--timeline-bg-accent) 0%, transparent 200px);"
>
	<div
		class="left-0 top-0 bottom-0 w-[180px] h-full border-r border-[var(--timeline-track-border)] flex items-center px-3 gap-2 z-20 track-left-part sticky"
		style="background: linear-gradient(135deg, var(--timeline-bg-accent) 0%, var(--timeline-bg-secondary) 100%);"
	>
		<span class="material-icons text-base opacity-80">{track.getIcon()}</span>
		<span class="text-[var(--text-secondary)] text-xs font-medium truncate">{track.getName()}</span>

		{#if track.type === TrackType.Audio}
			<div class="absolute bottom-0 right-0.5 opacity-45 hover:opacity-100 transition-opacity">
				<section class="flex items-center gap-1">
					<input
						type="checkbox"
						bind:checked={globalState.settings!.persistentUiState.showWaveforms}
						class="cursor-pointer"
						title="Show waveforms"
						id="show-waveforms-checkbox"
					/>
					<label
						class="text-xs text-[var(--text-secondary)] cursor-pointer pt-1"
						for="show-waveforms-checkbox"
					>
						<span class="material-icons">graphic_eq</span>
					</label>
				</section>
			</div>
		{/if}
	</div>
	<div class="absolute left-[180px] top-0 bottom-0 right-0 z-[5]">
		{#if track.type === TrackType.CustomClip}
			{@const total = track.clips.length}
			<!-- Container relatif pour positionner chaque lane -->
			<div class="absolute inset-0">
				{#each track.clips as clip, index (clip.id)}
					<div
						class="absolute left-0 right-0"
						style="top: {((total - 1 - index) * 100) / total}%; height: {100 / total}%;"
					>
						<div class="relative h-full">
							<CustomClipComponent bind:clip={track.clips[index] as CustomClip} {track} />
						</div>
					</div>
				{/each}
			</div>
		{:else}
			<div class="flex items-center h-full px-3 gap-2">
				{#each track.clips as clip, index}
					{#if track.type === TrackType.Subtitle}
						{@const nextIsSameVerse =
							(track as SubtitleTrack).getSubtitleAfter(index)?.verse ===
							(clip as SubtitleClipType).verse}
						{@const previousIsSameVerse =
							(track as SubtitleTrack).getSubtitleBefore(index)?.verse ===
							(clip as SubtitleClipType).verse}

						<SubtitleClipComponent
							bind:clip={track.clips[index] as SubtitleClipType}
							{track}
							{nextIsSameVerse}
							{previousIsSameVerse}
						/>
					{:else}
						<ClipComponent {clip} {track} />
					{/if}
				{/each}
			</div>
		{/if}
	</div>
</div>

<style>
	.flex-1:hover {
		background: linear-gradient(90deg, rgba(88, 166, 255, 0.05) 0%, transparent 200px);
	}
</style>

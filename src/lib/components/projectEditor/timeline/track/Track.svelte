<script lang="ts">
	import {
		TrackType,
		type AssetType,
		type Track,
		type SubtitleClip as SubtitleClipType,
		Clip,
		SubtitleClip,
		CustomTextClip
	} from '$lib/classes';
	import { globalState } from '$lib/runes/main.svelte';
	import ClipComponent from './Clip.svelte';
	import SubtitleClipComponent from './SubtitleClip.svelte';
	import CustomTextClipComponent from './CustomTextClip.svelte';

	let {
		track = $bindable()
	}: {
		track: Track;
	} = $props();

	// function getCustomTextAsClips(): CustomTextClip[] {
	// 	const customTexts = globalState.getVideoStyle.getAllCustomTexts();
	// 	let clips: CustomTextClip[] = [];
	// 	for (const category of customTexts) {
	// 		clips.push(
	// 			new CustomTextClip(
	// 				category,
	// 				globalState.getVideoStyle.getStyleFromCategory(category, 'time-appearance')
	// 					.value as number,
	// 				globalState.getVideoStyle.getStyleFromCategory(category, 'time-disappearance')
	// 					.value as number
	// 			)
	// 		);
	// 	}
	// 	return clips;
	// }
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
						bind:checked={globalState.currentProject!.projectEditorState.timeline.showWaveforms}
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
	<div class="absolute left-[180px] top-0 bottom-0 flex items-center px-3 gap-2 z-[5]">
		{#each track.clips as clip, index}
			{#if track.type === TrackType.Subtitle}
				<SubtitleClipComponent bind:clip={track.clips[index] as SubtitleClipType} {track} />
			{:else if track.type === TrackType.CustomText}
				<CustomTextClipComponent bind:clip={track.clips[index] as CustomTextClip} {track} />
			{:else}
				<ClipComponent {clip} {track} />
			{/if}
		{/each}
	</div>
</div>

<style>
	.flex-1:hover {
		background: linear-gradient(90deg, rgba(88, 166, 255, 0.05) 0%, transparent 200px);
	}
</style>

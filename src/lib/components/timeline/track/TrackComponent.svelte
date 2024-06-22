<script lang="ts">
	import type { SubtitleTrack, Track } from '$lib/models/Timeline';
	import LeftPart from './LeftPart.svelte';
	import { zoom } from '$lib/stores/TimelineStore';
	import { getAssetFromId } from '$lib/ext/Id';
	import ClipComponent from './ClipComponent.svelte';
	import SubtitleClipComponent from './SubtitleClipComponent.svelte';

	export let track: Track | SubtitleTrack;
</script>

<div class="h-20 flex flex-row border-y-2 border-[#1d1b1b] text-xs w-max min-w-full">
	<LeftPart>
		<p>{track.type}</p>
		<p class="mt-auto underline">Name:</p>
		<input
			type="text"
			bind:value={track.name}
			class="bg-transparent text-white outline-none select-none"
		/>
	</LeftPart>

	<div class="flex flex-col w-full z-10 bg-[#2d2b2b]">
		<div class="flex flex-row h-full">
			{#if track.type !== 'Subtitles track'}
				{#each track.clips as clip, i}
					{@const asset = getAssetFromId(clip.assetId)}

					{#if asset}
						<ClipComponent {asset} bind:track bind:clip {i} />
					{/if}
				{/each}
			{:else}
				{#each track.clips as clip, i}
					<SubtitleClipComponent bind:clip />
				{/each}
			{/if}
		</div>
	</div>
</div>

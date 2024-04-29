<script lang="ts">
	import type { Track } from '$lib/classes/Timeline';
	import LeftPart from './LeftPart.svelte';
	import { zoom } from '$lib/stores/TimelineStore';
	import { getAssetFromId } from '$lib/ext/Id';

	export let track: Track;
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
			{#each track.clips as clip}
				{@const asset = getAssetFromId(clip.assetId)}

				{#if asset}
					<div
						class="h-full bg-[#538c96] border-r-2 border-[#1d1b1b] cursor-pointer p-1 overflow-hidden"
						style="width: {($zoom * clip.duration) / 1000}px;"
					>
						<p class="text-white text-xs">{asset.fileName}</p>
					</div>
				{/if}
			{/each}
		</div>
	</div>
</div>

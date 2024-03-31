<script lang="ts">
	import type { VideoTrack } from '$lib/classes/Timeline';
	import LeftPart from './LeftPart.svelte';

	export let track: VideoTrack;
</script>

<div class="h-20 flex flex-row border-y-2 border-[#1d1b1b] text-xs">
	<LeftPart>
		<p>Video track</p>
		<p class="mt-auto underline">Name:</p>
		<input
			type="text"
			bind:value={track.name}
			class="bg-transparent text-white outline-none w-full select-none"
		/>
	</LeftPart>

	<div class="flex flex-col w-full z-10 bg-[#2d2b2b]">
		<div class="flex flex-row h-full"></div>
	</div>
</div>

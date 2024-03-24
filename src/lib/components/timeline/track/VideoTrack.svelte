<script lang="ts">
	import type { VideoTrack } from '$lib/classes/Timeline';

	export let track: VideoTrack;
</script>

<div class="w-full h-20 bg-[#2d2b2b] flex flex-row border-y-2 border-[#1d1b1b] text-xs">
	<div
		class="w-28 lg:w-44 h-full bg-[#141212] border-r-2 border-[#1d1b1b] sticky left-0 p-1.5 flex flex-col"
	>
		<p>Video track</p>
		<p class="mt-auto underline">Name:</p>
		<input
			type="text"
			bind:value={track.name}
			class="bg-transparent text-white outline-none w-full"
		/>
	</div>

	<div class="flex flex-col w-full">
		<div class="flex flex-row w-full h-full"></div>
	</div>
</div>

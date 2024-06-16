<script lang="ts">
	import { milisecondsToMMSS } from '$lib/classes/Timeline';
	import { currentProject } from '$lib/stores/ProjectStore';

	let div: HTMLDivElement;

	$: if ($currentProject.timeline.subtitlesTracks[0].clips && div) {
		// Scroll to the bottom of the div
		div.scrollTop = div.scrollHeight;
	}
</script>

<div class="h-full w-full bg-black overflow-y-scroll" bind:this={div}>
	{#each $currentProject.timeline.subtitlesTracks[0].clips as subtitle}
		<div
			class="flex justify-between xl:items-center p-2 bg-[#1f1f1f] border-b-2 border-[#413f3f] flex-col xl:flex-row"
		>
			<p class="text-xs xl:text-sm text-right xl:text-left">
				{milisecondsToMMSS(subtitle.start)} - {milisecondsToMMSS(subtitle.end)}
			</p>
			<p class="arabic text-right xl:max-w-[60%]">{subtitle.text}</p>
		</div>
	{/each}
</div>

<script lang="ts">
	import { milisecondsToMMSS } from '$lib/classes/Timeline';
	import { currentProject } from '$lib/stores/ProjectStore';
	import { getEditionFromName } from '$lib/stores/QuranStore';

	let div: HTMLDivElement;

	$: if ($currentProject.timeline.subtitlesTracks[0].clips && div) {
		// Scroll to the bottom of the div
		div.scrollTop = div.scrollHeight;
	}
</script>

<div class="h-full w-full bg-[#1f1f1f] overflow-y-scroll" bind:this={div}>
	{#each $currentProject.timeline.subtitlesTracks[0].clips as subtitle}
		<div class="p-2 bg-[#1f1f1f] border-b-2 border-[#413f3f]">
			<div class="flex justify-between xl:items-center flex-col xl:flex-row w-full">
				<p class="text-xs xl:text-sm text-right xl:text-left">
					{milisecondsToMMSS(subtitle.start)} - {milisecondsToMMSS(subtitle.end)}
				</p>
				<p class="arabic text-right xl:max-w-[60%]">{subtitle.text}</p>
			</div>

			<div class="flex flex-col mt-1">
				{#each Object.keys(subtitle.translations) as translation}
					<p class="text-xs text-justify text-[#7cce79]">
						<span class="text-green-500 font-bold"
							>{getEditionFromName(translation)?.language}:</span
						>
						{subtitle.translations[translation]}
					</p>
				{/each}
			</div>
		</div>
	{/each}
</div>

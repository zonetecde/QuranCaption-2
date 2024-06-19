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
			<div class="flex flex-col w-full">
				<p class="text-xs text-left">
					{milisecondsToMMSS(subtitle.start)} - {milisecondsToMMSS(subtitle.end)}
				</p>
				<p class="arabic text-right w-full">{subtitle.text}</p>
			</div>

			<div class="flex flex-col mt-1">
				{#if !subtitle.isSilence}
					{#each $currentProject.projectSettings.addedTranslations as translation}
						<p class="text-xs text-justify text-[#c5d4c4]">
							<span class="text-[#8cbb8a] font-bold"
								>{getEditionFromName(translation)?.language}:</span
							>
							{subtitle.translations[translation] ?? 'Downloading...'}
						</p>
					{/each}
				{:else}
					<i class="text-xs text-justify text-[#c5d4c4]">Silence</i>
				{/if}
			</div>
		</div>
	{/each}
</div>

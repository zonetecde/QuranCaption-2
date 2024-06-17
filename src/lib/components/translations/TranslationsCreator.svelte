<script lang="ts">
	import { milisecondsToMMSS } from '$lib/classes/Timeline';
	import { currentProject } from '$lib/stores/ProjectStore';
	import { getEditionFromName } from '$lib/stores/QuranStore';

	import TranslationsCreatorHeader from './TranslationsCreatorHeader.svelte';
</script>

<div class="bg-[#0f0f0f] w-full h-full overflow-y-auto flex flex-col">
	<TranslationsCreatorHeader />
	<div class="mt-0 flex flex-grow flex-col overflow-y-auto">
		{#each $currentProject.timeline.subtitlesTracks[0].clips as subtitle}
			<div class="p-2 bg-[#1f1f1f] border-b-2 border-[#413f3f]">
				<div class="flex justify-between items-start flex-col w-full">
					<p class="text-xs -mt-1 text-left">
						{milisecondsToMMSS(subtitle.start)} - {milisecondsToMMSS(subtitle.end)}
					</p>
					<p class="w-full arabic text-right text-4xl mt-4 leading-[3.5rem]">{subtitle.text}</p>
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
</div>

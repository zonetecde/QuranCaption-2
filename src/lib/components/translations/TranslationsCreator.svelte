<script lang="ts">
	import { currentProject } from '$lib/stores/ProjectStore';

	import TranslationInput from './TranslationInput.svelte';
	import TranslationsCreatorHeader from './TranslationsCreatorHeader.svelte';
</script>

<div class="bg-[#0f0f0f] w-full h-full flex flex-col">
	<TranslationsCreatorHeader />

	<div class="mt-0 flex flex-grow flex-col py-4 bg-[#1f1f1f]">
		{#each $currentProject.timeline.subtitlesTracks[0].clips as subtitle, i}
			{#if !subtitle.isSilence}
				<TranslationInput bind:subtitle subtitleIndex={i} />
			{/if}
		{/each}
	</div>
</div>

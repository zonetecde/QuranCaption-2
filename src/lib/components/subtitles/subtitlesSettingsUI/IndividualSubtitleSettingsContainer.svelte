<script lang="ts">
	import { currentProject } from '$lib/stores/ProjectStore';
	import SubtitlesListItem from '../SubtitlesListItem.svelte';
</script>

<div class="flex flex-col">
	<div class="h-full w-full bg-[#1f1f1f]">
		<p><strong>Click on the subtitle you want to customize</strong></p>

		{#each $currentProject.timeline.subtitlesTracks[0].clips as subtitle}
			<SubtitlesListItem {subtitle} />
		{/each}
	</div>
</div>

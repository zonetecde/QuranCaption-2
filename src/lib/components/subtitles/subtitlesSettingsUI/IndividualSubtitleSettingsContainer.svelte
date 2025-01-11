<script lang="ts">
	import Slider from '$lib/components/common/Slider.svelte';
	import Toggle from '$lib/components/common/Toggle.svelte';
	import { ImgFileExt } from '$lib/ext/File';
	import { milisecondsToMMSS } from '$lib/models/Timeline';
	import {
		currentlyCustomizedSubtitleId,
		showSubtitlesPadding,
		userFonts
	} from '$lib/stores/LayoutStore';
	import { currentProject } from '$lib/stores/ProjectStore';
	import { cursorPosition, getLastClipEnd } from '$lib/stores/TimelineStore';
	import { open } from '@tauri-apps/api/dialog';
	import toast from 'svelte-french-toast';
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

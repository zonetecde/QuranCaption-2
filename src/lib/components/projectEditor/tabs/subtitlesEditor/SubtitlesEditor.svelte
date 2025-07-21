<script lang="ts">
	import { globalState } from '$lib/runes/main.svelte';
	import Timeline from '../../timeline/Timeline.svelte';
	import VideoPreview from '../../videoPreview/VideoPreview.svelte';
	import DiviseurRedimensionnable from '../DiviseurRedimensionnable.svelte';
	import SubtitlesEditorSettings from './SubtitlesEditorSettings.svelte';
	import SubtitlesWorkspace from './SubtitlesWorkspace.svelte';
</script>

<div class="flex-grow w-full max-w-full flex overflow-hidden h-full min-h-0">
	<!-- Assets -->
	<section
		class="w-[250px] flex-shrink-0 divide-y-2 divide-color max-h-full overflow-hidden flex flex-col border-r-2 border-color border-t-2"
	>
		<SubtitlesEditorSettings />
	</section>
	<section class="flex-1 min-w-0 flex flex-row max-h-full min-h-0">
		<section class="w-full min-w-0 flex flex-col min-h-0">
			<!-- Video preview -->
			<SubtitlesWorkspace />

			<DiviseurRedimensionnable />

			<!-- Timeline -->
			<Timeline />
		</section>
	</section>
	<!-- Settings -->
	<section
		class="w-[250px] flex-shrink-0 divide-y-2 divide-color max-h-full overflow-hidden flex flex-col border-l-2 border-color border-t-2"
	>
		<div class="w-full h-48">
			<VideoPreview showControls={false} />
		</div>
	</section>
</div>

<style>
</style>

<script lang="ts">
	import { globalState } from '$lib/runes/main.svelte';
	import Timeline from '../../timeline/Timeline.svelte';
	import VideoPreview from '../../videoPreview/VideoPreview.svelte';
	import DiviseurRedimensionnable from '../DiviseurRedimensionnable.svelte';
	import AssetsManager from './assetsManager/AssetsManager.svelte';
</script>

<div class="flex-grow w-full max-w-full flex overflow-hidden h-full min-h-0">
	<!-- Assets -->
	<section
		class="w-[250px] flex-shrink-0 divide-y-2 divide-color max-h-full overflow-hidden flex flex-col border-r-2 border-color border-t-2"
	>
		<AssetsManager />
	</section>
	<section class="flex-1 min-w-0 flex flex-row max-h-full min-h-0">
		<section class="w-full min-w-0 flex flex-col min-h-0">
			<!-- Video preview -->
			<section
				class="overflow-hidden min-h-0"
				style="height: {globalState.currentProject!.projectEditorState.videoPreviewHeight}%;"
			>
				<VideoPreview />
			</section>

			<DiviseurRedimensionnable />

			<!-- Timeline -->
			<section
				class="overflow-hidden min-w-0 timeline-section flex-1 min-h-0"
				style="height: {100 - globalState.currentProject!.projectEditorState.videoPreviewHeight}%;"
			>
				<Timeline />
			</section>
		</section>
	</section>
	<!-- Settings -->
	<section
		class="w-[250px] flex-shrink-0 divide-y-2 divide-color max-h-full overflow-hidden flex flex-col border-l-2 border-color border-t-2"
	>
		<!-- <AssetsManager /> -->
	</section>
</div>

<style>
</style>

<script lang="ts">
	import { fullScreenPreview, videoEditorSelectedTab } from '$lib/stores/LayoutStore';
	import AssetsManager from '../assetsmanager/AssetsManager.svelte';
	import ExportOptions from '../export/ExportOptions.svelte';
	import VideoPreview from '../preview/VideoPreview.svelte';
	import SubtitleSettings from '../subtitles/subtitlesSettingsUI/SubtitleSettingsContainer.svelte';
	import Timeline from '../timeline/Timeline.svelte';
</script>

<div class="flex-row w-full h-full grid grid-cols-2-template">
	<section class="flex-grow flex flex-row divide-x-4 divide-[#413f3f]">
		<!-- Editor -->
		<section class="w-full divide-y-4 divide-[#413f3f]">
			<!-- Video preview -->
			<section class={$fullScreenPreview ? 'absolute inset-0 z-50' : 'h-[65%] max-h-[65%]'}>
				<VideoPreview hideControls={$fullScreenPreview} />
			</section>

			<!-- Timeline -->
			<section class="h-[35%]">
				<Timeline />
			</section>
		</section>
	</section>

	<section
		class="min-w-[220px] divide-y-2 divide-[#413f3f] max-h-full overflow-hidden flex flex-col"
	>
		<ExportOptions />
	</section>
</div>

<style>
	/* grid cols 2 : first col 75% the second col 25% */
	.grid-cols-2-template {
		grid-template-columns: 75% 25%;
	}

	.selected {
		background-color: #202c1c;
		color: white;
	}
</style>

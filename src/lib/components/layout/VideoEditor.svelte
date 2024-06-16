<script lang="ts">
	import { onMount } from 'svelte';
	import AssetsManager from '../assetsmanager/AssetsManager.svelte';
	import Timeline from '../timeline/Timeline.svelte';
	import VideoPreview from '../preview/VideoPreview.svelte';
	import SubtitleSettings from '../subtitles/subtitlesSettingsUI/SubtitleSettingsContainer.svelte';
</script>

<div class="flex-row w-full h-full grid grid-cols-2-template">
	<!-- Quran and clip explorer -->
	<section
		class="min-w-[220px] divide-y-2 divide-[#413f3f] max-h-full overflow-hidden flex flex-col"
	>
		<AssetsManager />

		<SubtitleSettings />
	</section>

	<section class="flex-grow flex flex-row divide-x-4 divide-[#413f3f]">
		<!-- Editor -->
		<section class="w-full divide-y-4 divide-[#413f3f]">
			<!-- Video preview -->
			<section class="h-[65%] max-h-[65%]">
				<VideoPreview />
			</section>

			<!-- Timeline -->
			<section class="h-[35%]">
				<Timeline />
			</section>
		</section>
	</section>
</div>

<style>
	/* grid cols 2 : first col 25% the second col 75% */
	.grid-cols-2-template {
		grid-template-columns: 25% 75%;
	}
</style>

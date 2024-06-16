<script lang="ts">
	import AssetsManager from '../assetsmanager/AssetsManager.svelte';
	import VideoPreview from '../preview/VideoPreview.svelte';
	import SubtitleCreator from '../subtitles/SubtitleCreator.svelte';
	import SubtitlesList from '../subtitles/SubtitlesList.svelte';
	import SubtitleSettingsContainer from '../subtitles/subtitlesSettingsUI/SubtitleSettingsContainer.svelte';
	import Timeline from '../timeline/Timeline.svelte';
	import TranslationsCreator from '../translations/TranslationsCreator.svelte';
</script>

<div class="flex-row w-full h-full grid grid-cols-3-template">
	<!-- Quran and clip explorer -->
	<section class="min-w-[220px] max-h-full overflow-hidden">
		<SubtitleSettingsContainer />
	</section>

	<section class="flex-grow flex flex-row divide-x-4 divide-[#413f3f]">
		<!-- Editor -->
		<section class="w-full divide-y-4 divide-[#413f3f]">
			<!-- Subtitle Editor -->
			<section class="h-[85%] max-h-[85%]">
				<TranslationsCreator />
			</section>

			<!-- Timeline -->
			<section class="h-[15%]">
				<Timeline />
			</section>
		</section>
	</section>

	<!-- Preview + Subtitles -->
	<section class="min-w-[120px] flex flex-col overflow-hidden border-l-2 border-[#413f3f]">
		<div class="h-fit min-h-40">
			<VideoPreview hideControls />
		</div>
		<div class="overflow-hidden h-full">
			<SubtitlesList />
		</div>
	</section>
</div>

<style>
	/* grid cols 2 : first col 25% the second col 75% */
	.grid-cols-3-template {
		grid-template-columns: 15% 70% 15%;
	}
</style>

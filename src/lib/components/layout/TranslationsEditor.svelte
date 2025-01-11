<script lang="ts">
	import AssetsManager from '../assetsmanager/AssetsManager.svelte';
	import VideoPreview from '../preview/VideoPreview.svelte';
	import SubtitlesList from '../subtitles/SubtitlesList.svelte';
	import SubtitleSettingsContainer from '../subtitles/subtitlesSettingsUI/SubtitleSettingsContainer.svelte';
	import Timeline from '../timeline/Timeline.svelte';
	import TranslationsCreator from '../translations/TranslationsCreator.svelte';
	import TranslationsSettings from '../translations/TranslationsSettings.svelte';
</script>

<div class="flex-row w-full h-full grid grid-cols-3-template overflow-y-scroll">
	<!-- Quran and clip explorer -->
	<section class="min-w-[220px] max-h-full overflow-hidden">
		<TranslationsSettings />
	</section>

	<!-- Translations  Editor -->
	<TranslationsCreator />

	<!-- Preview + Subtitles -->
	<section class="min-w-[120px] flex flex-col overflow-hidden border-l-2 border-[#413f3f]">
		<SubtitlesList />
	</section>
</div>

<style>
	@media (min-width: 1280px) {
		.grid-cols-3-template {
			grid-template-columns: 15% 70% 15%;
		}
	}

	@media (max-width: 1279px) {
		.grid-cols-3-template {
			grid-template-columns: 23% 62% 15%;
		}
	}
</style>

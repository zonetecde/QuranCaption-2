<script lang="ts">
	import { addOtherTextsPopupVisibility } from '$lib/stores/LayoutStore';
	import VideoPreview from '../preview/VideoPreview.svelte';
	import AddOtherTextsPopup from '../subtitles/AddOtherTextsPopup.svelte';
	import SubtitleEditor from '../subtitles/SubtitleEditor.svelte';
	import SubtitlesEditorSettings from '../subtitles/SubtitlesEditorSettings.svelte';
	import SubtitlesList from '../subtitles/SubtitlesList.svelte';
	import Timeline from '../timeline/Timeline.svelte';
</script>

<div class="flex-row w-full h-full grid grid-cols-3-template">
	<!-- Quran and clip explorer -->
	<section class="min-w-[220px] max-h-full overflow-hidden">
		<SubtitlesEditorSettings />
	</section>

	<section class="flex-grow flex flex-row divide-x-4 divide-[#413f3f]">
		<!-- Editor -->
		<section class="w-full divide-y-4 divide-[#413f3f]">
			<!-- Subtitle Editor -->
			<section class="h-[65%] max-h-[65%]">
				<SubtitleEditor />
			</section>

			<!-- Timeline -->
			<section class="h-[35%]">
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

{#if $addOtherTextsPopupVisibility}
	<AddOtherTextsPopup />
{/if}

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

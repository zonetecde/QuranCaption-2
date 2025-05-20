<script lang="ts">
	import type { SurahNameSettings } from '$lib/models/Project';
	import type { SubtitleClip } from '$lib/models/Timeline';
	import { videoDimensions } from '$lib/stores/LayoutStore';
	import { getTextName } from '$lib/stores/OtherTextsStore';
	import { currentProject } from '$lib/stores/ProjectStore';
	import { Mushaf } from '$lib/stores/QuranStore';
	import { latestSurah } from '$lib/stores/VideoPreviewStore';
	import { onMount } from 'svelte';
	import { fade } from 'svelte/transition';

	export let currentSubtitle: SubtitleClip;
	$: surahNameSettings = $currentProject.projectSettings.globalSubtitlesSettings.surahNameSettings;

	$: if (currentSubtitle && currentSubtitle.surah !== -1) {
		latestSurah.set(currentSubtitle.surah);
	} else if (currentSubtitle && currentSubtitle.surah === -1) {
		// cherche la dernière sourate dans le projet juste apres currentsubtitle.start
		const surah = $currentProject.timeline.subtitlesTracks[0].clips.find((subtitle) => {
			return (
				subtitle.start > currentSubtitle.start &&
				subtitle.surah !== -1 &&
				subtitle.surah !== undefined
			);
		});
		if (surah) {
			latestSurah.set(surah.surah);
		} else {
			latestSurah.set(-1);
		}
	}

	let size = 1;
</script>

{#if currentSubtitle && $latestSurah !== -1}
	{@const subtitleVerticalPosition =
		$currentProject.projectSettings.globalSubtitlesSettings.surahNameSettings.verticalPosition}
	{@const subtitleTextSize =
		$currentProject.projectSettings.globalSubtitlesSettings.surahNameSettings.size}

	{#if surahNameSettings.enable && $latestSurah && $latestSurah !== -1}
		<div
			transition:fade
			class="absolute top-0 left-1/2 -translate-x-1/2"
			style={`top: ${subtitleVerticalPosition}px; --tw-scale-x: ${subtitleTextSize}; --tw-scale-y: ${subtitleTextSize}; transform: translate(var(--tw-translate-x), var(--tw-translate-y)) rotate(var(--tw-rotate)) skewX(var(--tw-skew-x)) skewY(var(--tw-skew-y)) scaleX(var(--tw-scale-x)) scaleY(var(--tw-scale-y));`}
		>
			<div
				class="flex items-center justify-center h-full"
				style="opacity: {surahNameSettings.opacity}"
			>
				<div class="text-center flex flex-col">
					{#if $latestSurah >= 1}
						<img
							class="size-[100px]"
							src={`https://cdn.amrayn.com/qimages-c/${$latestSurah.toString()}.svg`}
							alt="Surah Name"
							style="filter: invert(100%) brightness(200%) contrast(100%);"
						/>
					{:else}
						<!-- placeholder qui prends la même taille que l'img en temps habituel -->
						<div class="h-[100px] w-[100px"></div>
					{/if}
					{#if surahNameSettings.showLatin && $Mushaf}
						<p
							class="text-white -mt-9 text-[10px]"
							style="font-family: {$currentProject.projectSettings.globalSubtitlesSettings
								.creatorText.fontFamily};"
						>
							{#if $latestSurah >= 1}
								{surahNameSettings.latinTextBeforeSurahName}
								{$Mushaf.surahs[$latestSurah - 1].transliteration}
							{:else if $latestSurah <= -2}
								{getTextName($latestSurah)}
							{/if}
						</p>
					{/if}
				</div>
			</div>
		</div>
	{/if}
{/if}

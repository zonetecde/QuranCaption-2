<script lang="ts">
	import { calculateFontSize } from '$lib/functions/VideoPreviewCalc';
	import type { SurahNameSettings } from '$lib/models/Project';
	import type { SubtitleClip } from '$lib/models/Timeline';
	import { videoDimensions } from '$lib/stores/LayoutStore';
	import { currentProject } from '$lib/stores/ProjectStore';
	import { Mushaf } from '$lib/stores/QuranStore';
	import { latestSurah } from '$lib/stores/VideoPreviewStore';
	import { onMount } from 'svelte';
	import { fade } from 'svelte/transition';

	export let currentSubtitle: SubtitleClip;
	$: surahNameSettings = $currentProject.projectSettings.globalSubtitlesSettings.surahNameSettings;

	$: $videoDimensions, calculateSubtitleTextSize();

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

	function calculateSubtitleTextSize() {
		// Calcul la taille de la police pour les sous-titres
		size =
			calculateFontSize(
				$currentProject.projectSettings.globalSubtitlesSettings.surahNameSettings.size
			) * 0.1;
	}
</script>

{#if currentSubtitle && $latestSurah !== -1}
	<!-- Calcul permettant de calculer la bonne hauteur en fonction de la taille de la vidéo -->
	{@const subtitleVerticalPosition =
		$videoDimensions.height *
		($currentProject.projectSettings.globalSubtitlesSettings.surahNameSettings.verticalPosition /
			100)}
	<!-- Calcul permettant de calculer la bonne largeur du texte en fonction de la taille de la vidéo -->
	{@const subtitleHorizontalPadding =
		$videoDimensions.width *
		($currentProject.projectSettings.globalSubtitlesSettings.horizontalPadding / 100)}

	{#if surahNameSettings.enable && $latestSurah && $latestSurah !== -1}
		<div
			transition:fade
			class="absolute left-1/2 -translate-x-1/2"
			style={`--tw-scale-x: ${size}; --tw-scale-y: ${size}; transform: translate(var(--tw-translate-x), var(--tw-translate-y)) rotate(var(--tw-rotate)) skewX(var(--tw-skew-x)) skewY(var(--tw-skew-y)) scaleX(var(--tw-scale-x)) scaleY(var(--tw-scale-y)); width: ${$videoDimensions.width}px; padding: 0px ${subtitleHorizontalPadding}px; top: ${subtitleVerticalPosition}px;`}
		>
			<div
				class="flex items-center justify-center h-full"
				style="opacity: {surahNameSettings.opacity}"
			>
				<div class="text-center flex flex-col" style={`font-size: px;`}>
					<img
						class="size-[100px]"
						src={`https://cdn.amrayn.com/qimages-c/${$latestSurah.toString()}.svg`}
						alt="Surah Name"
						style="filter: invert(100%) brightness(200%) contrast(100%);"
					/>

					{#if surahNameSettings.showLatin && $Mushaf}
						<p
							class="text-white -mt-9 text-[10px]"
							style="font-family: {$currentProject.projectSettings.globalSubtitlesSettings
								.creatorText.fontFamily};"
						>
							{surahNameSettings.latinTextBeforeSurahName}
							{$Mushaf.surahs[$latestSurah - 1].transliteration}
						</p>
					{/if}
				</div>
			</div>
		</div>
	{/if}
{/if}

<script lang="ts">
	import type { SubtitleClip } from '$lib/models/Timeline';
	import { calculateFontSize, latinNumberToArabic } from '$lib/ext/Utilities';

	import { currentPage, showSubtitlesPadding, videoDimensions } from '$lib/stores/LayoutStore';
	import { currentProject } from '$lib/stores/ProjectStore';
	import { Mushaf } from '$lib/stores/QuranStore';
	import { cursorPosition } from '$lib/stores/TimelineStore';
	import { onDestroy, onMount } from 'svelte';
	import { fade } from 'svelte/transition';

	export let currentSubtitle: SubtitleClip;
	export let hideControls = false;
	export let subtitleLanguage: string;

	// @ts-ignore
	$: currentSubtitle = $currentProject.timeline.subtitlesTracks[0].clips.find(
		(subtitle) =>
			(subtitle.start === 0 &&
				subtitle.start <= $cursorPosition &&
				subtitle.end >= // // .end - $currentProject.projectSettings.globalSubtitlesSettings.fadeDuration On enlève un peu du temps de fin pour que le fade soit plus fluide (qu'il commence à disparaître avant la fin)
					$cursorPosition) ||
			(subtitle.start > 0 &&
				subtitle.start - 1000 < $cursorPosition &&
				subtitle.end >= // // .end - $currentProject.projectSettings.globalSubtitlesSettings.fadeDuration On enlève un peu du temps de fin pour que le fade soit plus fluide (qu'il commence à disparaître avant la fin)
					$cursorPosition)
	) || {
		// Permet de garder le sous-titre affiché avec un fondu de dispiration lorsqu'il n'y a plus de sous-titre
		id: '-1',
		start: 0,
		end: 0,
		text: ''
	};

	let subtitleTextSize = 1;

	$: $videoDimensions, calculateSubtitleTextSize();

	async function calculateSubtitleTextSize() {
		// Calcul la taille de la police pour les sous-titres
		subtitleTextSize = calculateFontSize(
			$currentProject.projectSettings.subtitlesTracksSettings[subtitleLanguage].fontSize
		);
	}
</script>

{#if currentSubtitle && $currentProject.projectSettings.subtitlesTracksSettings[subtitleLanguage].enableSubtitles}
	<!-- Ne pas créer de variable pour sibtitleFadeDuration, car on ne veut pas
une constante (sinon animation de fade lorsqu'on bouge le curseur dans la timeline)  -->
	{@const subtitleOutlineWidth =
		$currentProject.projectSettings.subtitlesTracksSettings[subtitleLanguage].outlineThickness}
	{@const enableOutline =
		$currentProject.projectSettings.subtitlesTracksSettings[subtitleLanguage].enableOutline}
	{@const subtitleOutlineColor =
		$currentProject.projectSettings.subtitlesTracksSettings[subtitleLanguage].outlineColor}
	<!-- Calcul permettant de calculer la bonne hauteur en fonction de la taille de la vidéo -->
	{@const subtitleVerticalPosition =
		$videoDimensions.height *
		($currentProject.projectSettings.subtitlesTracksSettings[subtitleLanguage].verticalPosition /
			100)}
	<!-- Calcul permettant de calculer la bonne largeur du texte en fonction de la taille de la vidéo -->
	{@const subtitleHorizontalPadding =
		$videoDimensions.width *
		(($currentProject.projectSettings.subtitlesTracksSettings[subtitleLanguage].horizontalPadding +
			$currentProject.projectSettings.globalSubtitlesSettings.horizontalPadding) /
			100)}

	{#key currentSubtitle.id}
		<!-- Si on cache la barre de controle alors la vidéo prend toute la height, sinon on soustrait la taille de la barre -->
		<div
			class={'inset-0  absolute left-1/2 -translate-x-1/2 ' + (hideControls ? '' : 'bottom-16')}
			style={`width: ${$videoDimensions.width}px; padding: 0px ${subtitleHorizontalPadding}px; top: ${subtitleVerticalPosition}px;`}
			in:fade={{
				duration: $currentProject.projectSettings.globalSubtitlesSettings.fadeDuration,
				delay: $currentProject.projectSettings.globalSubtitlesSettings.fadeDuration
			}}
			out:fade={{ duration: $currentProject.projectSettings.globalSubtitlesSettings.fadeDuration }}
		>
			<div
				class={'flex items-center justify-center h-full ' +
					($showSubtitlesPadding ? ' bg-blue-500 bg-opacity-30' : '')}
			>
				<p
					class="arabic text-center"
					style={`font-size: ${subtitleTextSize}px; ${
						enableOutline
							? `text-shadow: ` +
								`0 0 ${subtitleOutlineWidth}px ${subtitleOutlineColor},`.repeat(12) +
								`0 0 ${subtitleOutlineWidth}px ${subtitleOutlineColor};`
							: ``
					} opacity: ${
						$currentProject.projectSettings.subtitlesTracksSettings[subtitleLanguage].opacity
					}; color: ${
						$currentProject.projectSettings.subtitlesTracksSettings[subtitleLanguage].color
					};
					${
						$currentProject.projectSettings.subtitlesTracksSettings[subtitleLanguage].fontFamily ===
						'Hafs'
							? ''
							: `font-family: ${$currentProject.projectSettings.subtitlesTracksSettings[subtitleLanguage].fontFamily}`
					}; text-align: ${
						$currentProject.projectSettings.subtitlesTracksSettings[subtitleLanguage].alignment ||
						'center'
					}; ${
						subtitleLanguage === 'arabic' &&
						$currentProject.projectSettings.subtitlesTracksSettings[subtitleLanguage].alignment ===
							'justify'
							? 'direction: rtl;'
							: ''
					}`}
				>
					{#if currentSubtitle && currentSubtitle.text}
						{#if !currentSubtitle.isSilence}
							{#if subtitleLanguage === 'arabic'}
								{currentSubtitle.text}
								{#if $currentProject.projectSettings.subtitlesTracksSettings['arabic'].showVerseNumber && currentSubtitle.isLastWordInVerse}
									{latinNumberToArabic(currentSubtitle.verse.toString())}
								{/if}
							{:else if currentSubtitle.translations !== undefined}
								{#if $currentProject.projectSettings.subtitlesTracksSettings[subtitleLanguage].showVerseNumber && currentSubtitle.firstWordIndexInVerse === 0}
									{currentSubtitle.verse}.
								{/if}
								{currentSubtitle.translations[subtitleLanguage]}
							{/if}
						{/if}
					{/if}
				</p>
			</div>
		</div>
	{/key}
{/if}

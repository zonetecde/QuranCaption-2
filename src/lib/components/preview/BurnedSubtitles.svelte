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

	$: hasCustomIndividualSettings =
		currentSubtitle &&
		$currentProject.projectSettings.individualSubtitlesSettings[currentSubtitle.id] !== undefined;

	$: if (hasCustomIndividualSettings) {
		// set the css variables for the glow effect
		document.documentElement.style.setProperty(
			'--subtitleGlowColor',
			$currentProject.projectSettings.individualSubtitlesSettings[currentSubtitle.id].glowColor
		);

		document.documentElement.style.setProperty(
			'--subtitleGlowRadius',
			$currentProject.projectSettings.individualSubtitlesSettings[currentSubtitle.id].glowRadius +
				'px'
		);
	}

	$: subtitleSettingsForThisLang =
		$currentProject.projectSettings.subtitlesTracksSettings[subtitleLanguage];

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
		subtitleTextSize = calculateFontSize(subtitleSettingsForThisLang.fontSize);
	}
</script>

<svelte:head>
	{#if hasCustomIndividualSettings && $currentProject.projectSettings.individualSubtitlesSettings[currentSubtitle.id].glowEffect}
		<style>
			@keyframes glow {
				from {
					text-shadow:
						0 0 calc(var(--subtitleGlowRadius) * 1) var(--subtitleGlowColor),
						0 0 calc(var(--subtitleGlowRadius) * 1.5) var(--subtitleGlowColor),
						0 0 calc(var(--subtitleGlowRadius) * 2) var(--subtitleGlowColor),
						0 0 calc(var(--subtitleGlowRadius) * 2.5) var(--subtitleGlowColor),
						0 0 calc(var(--subtitleGlowRadius) * 3) var(--subtitleGlowColor),
						0 0 calc(var(--subtitleGlowRadius)) var(--subtitleGlowColor),
						0 0 calc(var(--subtitleGlowRadius) * 4) var(--subtitleGlowColor);
				}
				to {
					text-shadow:
						0 0 calc(var(--subtitleGlowRadius) * 1.2) var(--subtitleGlowColor),
						0 0 calc(var(--subtitleGlowRadius) * 1.7) var(--subtitleGlowColor),
						0 0 calc(var(--subtitleGlowRadius) * 2.2) var(--subtitleGlowColor),
						0 0 calc(var(--subtitleGlowRadius) * 2.7) var(--subtitleGlowColor),
						0 0 calc(var(--subtitleGlowRadius) * 3.2) var(--subtitleGlowColor),
						0 0 calc(var(--subtitleGlowRadius) * 3.7) var(--subtitleGlowColor),
						0 0 calc(var(--subtitleGlowRadius) * 4.2) var(--subtitleGlowColor);
				}
			}
		</style>
	{/if}
</svelte:head>

{#if currentSubtitle && subtitleSettingsForThisLang.enableSubtitles}
	<!-- Ne pas créer de variable pour sibtitleFadeDuration, car on ne veut pas
une constante (sinon animation de fade lorsqu'on bouge le curseur dans la timeline)  -->
	{@const subtitleOutlineWidth = subtitleSettingsForThisLang.outlineThickness}
	{@const enableOutline = subtitleSettingsForThisLang.enableOutline}
	{@const subtitleOutlineColor = subtitleSettingsForThisLang.outlineColor}
	<!-- Calcul permettant de calculer la bonne hauteur en fonction de la taille de la vidéo -->
	{@const subtitleVerticalPosition =
		$videoDimensions.height * (subtitleSettingsForThisLang.verticalPosition / 100)}
	<!-- Calcul permettant de calculer la bonne largeur du texte en fonction de la taille de la vidéo -->
	{@const subtitleHorizontalPadding =
		$videoDimensions.width *
		((subtitleSettingsForThisLang.horizontalPadding +
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
					class={'arabic text-center w-full subtitle-text ' +
						(hasCustomIndividualSettings &&
						$currentProject.projectSettings.individualSubtitlesSettings[currentSubtitle.id]
							.glowEffect
							? 'glow'
							: '')}
					style={`font-size: ${subtitleTextSize}px; ${
						enableOutline
							? `text-shadow: ` +
								`0 0 ${subtitleOutlineWidth}px ${subtitleOutlineColor},`.repeat(12) +
								`0 0 ${subtitleOutlineWidth}px ${subtitleOutlineColor};`
							: ``
					} opacity: ${subtitleSettingsForThisLang.opacity}; color: ${
						subtitleSettingsForThisLang.color
					};
					${
						subtitleSettingsForThisLang.fontFamily === 'Hafs'
							? ''
							: `font-family: ${subtitleSettingsForThisLang.fontFamily}`
					}; text-align: ${subtitleSettingsForThisLang.alignment || 'center'}; ${
						subtitleLanguage === 'arabic' && subtitleSettingsForThisLang.alignment === 'justify'
							? 'direction: rtl;'
							: ''
					};

					
					${
						hasCustomIndividualSettings
							? `
						${$currentProject.projectSettings.individualSubtitlesSettings[currentSubtitle.id].bold ? 'font-weight: bold;' : ''}
						${$currentProject.projectSettings.individualSubtitlesSettings[currentSubtitle.id].underline ? 'text-decoration: underline;' : ''}
						${$currentProject.projectSettings.individualSubtitlesSettings[currentSubtitle.id].italic ? 'font-style: italic;' : ''}
					`
							: ''
					}
					`}
				>
					{#if currentSubtitle && (currentSubtitle.text || currentSubtitle.isCustomText)}
						{#if subtitleLanguage === 'arabic'}
							{currentSubtitle.text}
							{#if $currentProject.projectSettings.subtitlesTracksSettings['arabic'].showVerseNumber && currentSubtitle.isLastWordInVerse && currentSubtitle.verse !== -1}
								{latinNumberToArabic(currentSubtitle.verse.toString())}
							{/if}
						{:else if currentSubtitle.translations !== undefined}
							{#if subtitleSettingsForThisLang.showVerseNumber && currentSubtitle.firstWordIndexInVerse === 0 && currentSubtitle.verse !== -1}
								{currentSubtitle.verse}.
							{/if}
							{currentSubtitle.translations[subtitleLanguage]}
						{/if}
					{/if}
				</p>
			</div>
		</div>
	{/key}
{/if}

<style>
	.glow {
		font-size: 80px;
		text-align: center;
		-webkit-animation: glow 1s ease-in-out infinite alternate;
		-moz-animation: glow 1s ease-in-out infinite alternate;
		animation: glow 1s ease-in-out infinite alternate;
	}
</style>

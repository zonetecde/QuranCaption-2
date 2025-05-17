<script lang="ts">
	import type { SubtitleClip } from '$lib/models/Timeline';

	import { latinNumberToArabic } from '$lib/functions/Arabic';
	import { calculateFontSize } from '$lib/functions/VideoPreviewCalc';
	import {
		calculateAdjustedVerticalPosition,
		fullScreenPreview,
		showSubtitlesPadding,
		videoDimensions
	} from '$lib/stores/LayoutStore';
	import { currentProject, hasSubtitleAtLeastOneStyle } from '$lib/stores/ProjectStore';
	import { cursorPosition } from '$lib/stores/TimelineStore';
	import { fade } from 'svelte/transition';
	import { currentlyExporting, triggerSubtitleResize } from '$lib/stores/ExportStore';
	import { isCalculatingNeededHeights } from '$lib/stores/VideoPreviewStore';

	export let currentSubtitle: SubtitleClip;
	export let hideControls = false;
	export let subtitleLanguage: string;
	let paragraph: HTMLElement;
	let displaySubtitle = true;

	$: hasCustomIndividualSettings =
		currentSubtitle && hasSubtitleAtLeastOneStyle(currentSubtitle.id);
	$: hasGlobalGlowEffect = $currentProject.projectSettings.globalSubtitlesSettings.globalGlowEffect;

	// pour le glow
	$: if (
		hasCustomIndividualSettings &&
		$currentProject.projectSettings.individualSubtitlesSettings[currentSubtitle.id].glowEffect
	) {
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
	} else if (hasGlobalGlowEffect) {
		// set the css variables for the glow effect
		document.documentElement.style.setProperty(
			'--subtitleGlowColor',
			$currentProject.projectSettings.globalSubtitlesSettings.globalGlowColor
		);

		document.documentElement.style.setProperty(
			'--subtitleGlowRadius',
			$currentProject.projectSettings.globalSubtitlesSettings.globalGlowRadius + 'px'
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

	$: if (
		// !$isCalculatingNeededHeights  -> c'est quand on appuie sur la checkbox `fitInOneLine`. Ça fait des calculs,
		// on ne veut pas que la taille du sous-titre change pendant ce temps là
		// $currentlyExporting -> c'est quand on exporte la vidéo. C'est manuellement géré dans le code de l'export pour éviter plusieurs appels à `calculateSubtitleTextSize`
		// $videoDimensions -> c'est quand on change la taille de la vidéo. On ne veut pas que la taille du sous-titre change pendant ce temps là
		(!$isCalculatingNeededHeights && !$currentlyExporting && $videoDimensions) ||
		$triggerSubtitleResize ||
		(!$currentlyExporting &&
			paragraph &&
			subtitleSettingsForThisLang.fitOnOneLine &&
			(($fullScreenPreview &&
				paragraph.clientHeight > subtitleSettingsForThisLang.neededHeightToFitFullScreen) ||
				(!$fullScreenPreview &&
					paragraph.clientHeight > subtitleSettingsForThisLang.neededHeightToFitSmallPreview)))
	)
		calculateSubtitleTextSize();

	async function calculateSubtitleTextSize() {
		// Calcul la taille de la police pour les sous-titres
		subtitleTextSize = calculateFontSize(subtitleSettingsForThisLang.fontSize);

		const p = document.getElementsByClassName(
			'subtitle-text ' + subtitleLanguage
		)[0] as HTMLElement;

		if (p) {
			if (subtitleSettingsForThisLang.fitOnOneLine) {
				displaySubtitle = false;

				const usedHeight = $fullScreenPreview
					? subtitleSettingsForThisLang.neededHeightToFitFullScreen
					: subtitleSettingsForThisLang.neededHeightToFitSmallPreview;

				while (
					p.clientHeight > usedHeight &&
					usedHeight !== -1 &&
					!p.innerHTML.includes('.CALCULATING.')
				) {
					subtitleTextSize -= 4;

					await new Promise((resolve) => setTimeout(resolve, 1));
				}
				displaySubtitle = true;
			}
		}
	}
</script>

<svelte:head>
	{#if hasGlobalGlowEffect || (hasCustomIndividualSettings && $currentProject.projectSettings.individualSubtitlesSettings[currentSubtitle.id].glowEffect)}
		<style>
			.glow {
				font-size: 80px;
				text-align: center;
				-webkit-animation: glow 2s ease-in-out infinite alternate;
				-moz-animation: glow 2s ease-in-out infinite alternate;
				animation: glow 2s ease-in-out infinite alternate;
			}

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
	{@const subtitleVerticalPosition = calculateAdjustedVerticalPosition(
		$videoDimensions.height,
		$videoDimensions.width,
		subtitleSettingsForThisLang.verticalPosition,
		$fullScreenPreview
	)}
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
					bind:this={paragraph}
					class={'arabic text-center w-full subtitle-text ' +
						subtitleLanguage +
						' ' +
						(hasCustomIndividualSettings || hasGlobalGlowEffect ? 'glow' : '')}
					style={`font-size: ${subtitleTextSize}px; ${
						enableOutline
							? `text-shadow: ` +
								`0 0 ${subtitleOutlineWidth}px ${subtitleOutlineColor},`.repeat(12) +
								`0 0 ${subtitleOutlineWidth}px ${subtitleOutlineColor};`
							: ``
					} opacity: ${displaySubtitle === false ? 0 : subtitleSettingsForThisLang.opacity}; color: ${
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
							{#if currentSubtitle.surah > 0}
								{currentSubtitle.text}
							{:else}
								<!-- custom text, replace *** with line break -->
								{@html currentSubtitle.text.replace(
									/\*\*\*/g,
									(
										$currentProject.projectSettings.subtitlesTracksSettings['arabic']
											.customTextSeparator || ' ••• '
									)
										.replaceAll(' ', '؜ ؜')
										.replaceAll('\\n', '<br>')
								)}
							{/if}
							{#if $currentProject.projectSettings.subtitlesTracksSettings['arabic'].showVerseNumber && currentSubtitle.isLastWordInVerse && currentSubtitle.verse !== -1 && currentSubtitle.surah > 0}
								{latinNumberToArabic(currentSubtitle.verse.toString())}
							{/if}
						{:else if currentSubtitle.translations !== undefined}
							{#if subtitleSettingsForThisLang.showVerseNumber && currentSubtitle.firstWordIndexInVerse === 0 && currentSubtitle.verse !== -1}
								{currentSubtitle.verse}.
							{/if}
							{#if currentSubtitle.surah > 0}
								{currentSubtitle.translations[subtitleLanguage]}
							{:else if currentSubtitle.translations[subtitleLanguage] !== undefined}
								<!-- custom text, replace *** with line break -->
								{@html currentSubtitle.translations[subtitleLanguage].replace(
									/\*\*\*/g,
									(
										$currentProject.projectSettings.subtitlesTracksSettings[subtitleLanguage]
											.customTextSeparator || '<br>'
									)
										.replaceAll(' ', ' ‎ ')
										.replaceAll('\\n', '<br>')
								)}
							{/if}
						{/if}
					{/if}
				</p>
			</div>
		</div>
	{/key}
{/if}

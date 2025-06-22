<script lang="ts">
	import type { SubtitleClip } from '$lib/models/Timeline';

	import { latinNumberToArabic } from '$lib/functions/Arabic';
	import {
		fullScreenPreview,
		showSubtitlesPadding,
		videoDimensions
	} from '$lib/stores/LayoutStore';
	import { currentProject, hasSubtitleAtLeastOneStyle } from '$lib/stores/ProjectStore';
	import { cursorPosition } from '$lib/stores/TimelineStore';
	import { fade } from 'svelte/transition';
	import { currentlyExporting, triggerSubtitleResize } from '$lib/stores/ExportStore';
	import { isCalculatingNeededHeights } from '$lib/stores/VideoPreviewStore';
	import toast from 'svelte-french-toast';

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

	let subtitleTextSize = 10;

	$: if (
		// !$isCalculatingNeededHeights  -> c'est quand on appuie sur la checkbox `fitInOneLine`. Ça fait des calculs,
		// on ne veut pas que la taille du sous-titre change pendant ce temps là
		// $currentlyExporting -> c'est quand on exporte la vidéo. C'est manuellement géré dans le code de l'export pour éviter plusieurs appels à `calculateSubtitleTextSize`
		// $videoDimensions -> c'est quand on change la taille de la vidéo. On ne veut pas que la taille du sous-titre change pendant ce temps là
		(!$isCalculatingNeededHeights && !$currentlyExporting) ||
		$triggerSubtitleResize ||
		(!$currentlyExporting && paragraph && subtitleSettingsForThisLang.fitOnOneLine)
	) {
		calculateSubtitleTextSize();
	}

	async function calculateSubtitleTextSize() {
		subtitleTextSize = subtitleSettingsForThisLang.fontSize;

		// Calcul la taille de la police pour les sous-titres
		const p = document.getElementsByClassName(
			'subtitle-text ' + subtitleLanguage
		)[0] as HTMLElement;

		if (p) {
			if (subtitleSettingsForThisLang.fitOnOneLine) {
				displaySubtitle = false;

				const usedHeight = $fullScreenPreview
					? subtitleSettingsForThisLang.neededHeightToFitFullScreen
					: subtitleSettingsForThisLang.neededHeightToFitSmallPreview;

				while (p.clientHeight > usedHeight && usedHeight !== -1 && !p.innerHTML.includes('|||')) {
					subtitleTextSize -= 4;

					await new Promise((resolve) => setTimeout(resolve, 1));
				}
				displaySubtitle = true;
			}
		}
		setTimeout(async () => {
			// now check if it collides with other subtitles
			// Get the visible subtitles
			const subtitleParagraphs = document.getElementsByClassName('subtitle-text');
			const processedSubtitles = new Set(); // Pour éviter de traiter plusieurs fois le même sous-titre
			const COLLISION_THRESHOLD = 20; // Seuil d'acceptabilité en pixels

			// Check if one collide with another
			for (let i = 0; i < subtitleParagraphs.length; i++) {
				const subtitle1 = subtitleParagraphs[i];

				// Si ce sous-titre a déjà été traité, on passe au suivant
				if (processedSubtitles.has(subtitle1)) continue;

				for (let j = i + 1; j < subtitleParagraphs.length; j++) {
					const subtitle2 = subtitleParagraphs[j];

					// Si ce sous-titre a déjà été traité, on passe au suivant
					if (processedSubtitles.has(subtitle2)) continue;
					const subtitle1Rect = subtitle1.getBoundingClientRect();
					const subtitle2Rect = subtitle2.getBoundingClientRect();

					// Vérifier si les deux sous-titres ont la même langue
					const subtitle1Classes = subtitle1.className.split(' ');
					const subtitle2Classes = subtitle2.className.split(' ');

					// Trouver la classe de langue (celle qui suit 'subtitle-text')
					const subtitle1LangIndex = subtitle1Classes.indexOf('subtitle-text') + 1;
					const subtitle2LangIndex = subtitle2Classes.indexOf('subtitle-text') + 1;

					const subtitle1Lang = subtitle1Classes[subtitle1LangIndex];
					const subtitle2Lang = subtitle2Classes[subtitle2LangIndex];

					// Si c'est la même langue, ne pas traiter la collision
					if (subtitle1Lang === subtitle2Lang) {
						continue;
					}

					// Calculer le chevauchement horizontal et vertical
					const horizontalOverlap = Math.max(
						0,
						Math.min(subtitle1Rect.right, subtitle2Rect.right) -
							Math.max(subtitle1Rect.left, subtitle2Rect.left)
					);
					const verticalOverlap = Math.max(
						0,
						Math.min(subtitle1Rect.bottom, subtitle2Rect.bottom) -
							Math.max(subtitle1Rect.top, subtitle2Rect.top)
					);

					if (
						subtitle1Rect.right > subtitle2Rect.left &&
						subtitle1Rect.left < subtitle2Rect.right &&
						subtitle1Rect.bottom > subtitle2Rect.top &&
						subtitle1Rect.top < subtitle2Rect.bottom &&
						// Vérifier que le chevauchement dépasse le seuil d'acceptabilité
						(horizontalOverlap > COLLISION_THRESHOLD || verticalOverlap > COLLISION_THRESHOLD) &&
						!isSubtitleFading(subtitle1) &&
						!isSubtitleFading(subtitle2) &&
						p !== subtitle1 &&
						p !== subtitle2 // On ne veut pas vérifier la collision avec le paragraphe actuel
					) {
						// Collision détectée, descendre le sous-titre le plus bas
						const movedElement = await moveSubtitleDownToAvoidCollision(p, subtitle1, subtitle2);

						// Marquer l'élément déplacé comme traité
						if (movedElement) {
							processedSubtitles.add(movedElement);
						}

						// Sortir de la boucle interne après avoir traité une collision
						break;
					}
				}
			}
		}, 10); // settimeout necessaire le temps que les autres sous-titres disparaissent
	}
	function isSubtitleFading(element: Element): boolean {
		const htmlElement = element as HTMLElement;

		// Le fade est appliqué au parent du parent du <p class="subtitle-text">
		const fadeContainer = htmlElement.parentElement?.parentElement;

		if (!fadeContainer) return false;

		const computedStyle = getComputedStyle(fadeContainer);

		// Vérifier si l'élément a une transition en cours sur l'opacity
		const transition = computedStyle.transition;
		const transitionProperty = computedStyle.transitionProperty;

		// Si la transition inclut "opacity" ou "all", c'est probablement un fade
		const hasOpacityTransition =
			transition !== 'none' &&
			(transitionProperty.includes('opacity') || transitionProperty.includes('all'));

		// Vérifier l'opacity actuelle - si elle n'est ni 0 ni 1, elle est probablement en transition
		const opacity = parseFloat(computedStyle.opacity);
		const isPartialOpacity = opacity > 0 && opacity < 1;

		return isPartialOpacity;
	}

	async function moveSubtitleDownToAvoidCollision(
		currentElement: HTMLElement,
		subtitle1: Element,
		subtitle2: Element
	): Promise<Element | null> {
		// Détermine quel sous-titre descendre (le plus bas actuellement)
		const subtitle1Rect = subtitle1.getBoundingClientRect();
		const subtitle2Rect = subtitle2.getBoundingClientRect();

		let elementToMove: Element;

		// Descendre celui qui est le plus bas pour éviter de trop perturber la mise en page
		if (subtitle1Rect.top > subtitle2Rect.top) {
			elementToMove = subtitle1;
		} else {
			elementToMove = subtitle2;
		}

		const elementToMoveHTML = elementToMove as HTMLElement;
		const containerDiv = elementToMoveHTML.parentElement?.parentElement;

		if (!containerDiv) return null;

		// Récupère la position verticale actuelle
		const currentStyle = containerDiv.style.top;
		let currentPosition = parseInt(currentStyle.replace('px', '')) || 0;

		// Descendre progressivement jusqu'à ce qu'il n'y ait plus de collision
		// pendant le temps de la descente, on ne veut pas que le sous-titre soit visible
		containerDiv.style.opacity = '0';
		while (true) {
			// Descendre de 20px (réduit pour un mouvement plus précis)
			currentPosition += 20;
			containerDiv.style.top = `${currentPosition}px`;

			// Attendre un peu pour que l'UI se mette à jour
			await new Promise((resolve) => setTimeout(resolve, 0));

			// Vérifier s'il y a encore collision
			const newSubtitle1Rect = subtitle1.getBoundingClientRect();
			const newSubtitle2Rect = subtitle2.getBoundingClientRect();

			const hasCollision =
				newSubtitle1Rect.right > newSubtitle2Rect.left &&
				newSubtitle1Rect.left < newSubtitle2Rect.right &&
				newSubtitle1Rect.bottom > newSubtitle2Rect.top &&
				newSubtitle1Rect.top < newSubtitle2Rect.bottom;

			// Si plus de collision ou si on atteint le bas de l'écran, on s'arrête
			if (!hasCollision || currentPosition > window.innerHeight - 100) {
				break;
			}
		}
		// Rendre le sous-titre visible à nouveau
		containerDiv.style.opacity = '1';

		return elementToMove;
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
	{@const subtitleVerticalPosition = subtitleSettingsForThisLang.verticalPosition}
	<!-- Calcul permettant de calculer la bonne largeur du texte en fonction de la taille de la vidéo -->
	{@const subtitleHorizontalPadding =
		subtitleSettingsForThisLang.horizontalPadding +
		$currentProject.projectSettings.globalSubtitlesSettings.horizontalPadding}

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

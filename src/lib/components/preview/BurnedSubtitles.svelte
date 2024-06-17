<script lang="ts">
	import type { SubtitleClip } from '$lib/classes/Timeline';
	import { getDisplayedVideoSize } from '$lib/ext/HtmlExt';
	import { currentPage, showSubtitlesPadding } from '$lib/stores/LayoutStore';
	import { currentProject } from '$lib/stores/ProjectStore';
	import { cursorPosition } from '$lib/stores/TimelineStore';
	import { onDestroy, onMount } from 'svelte';
	import { fade } from 'svelte/transition';

	export let currentSubtitle: SubtitleClip;
	export let hideControls = false;
	export let videoComponent: HTMLVideoElement;
	export let subtitleLanguage: string;

	let videoWidth = 1920;
	let videoHeight = 1080;

	$: currentSubtitle = $currentProject.timeline.subtitlesTracks[0].clips.find(
		(subtitle) =>
			(subtitle.start === 0 &&
				subtitle.start <= $cursorPosition &&
				subtitle.end - $currentProject.projectSettings.globalSubtitlesSettings.fadeDuration >= // On enlève un peu du temps de fin pour que le fade soit plus fluide (qu'il commence à disparaître avant la fin)
					$cursorPosition) ||
			(subtitle.start > 0 &&
				subtitle.start - 1000 < $cursorPosition &&
				subtitle.end - $currentProject.projectSettings.globalSubtitlesSettings.fadeDuration >= // On enlève un peu du temps de fin pour que le fade soit plus fluide (qu'il commence à disparaître avant la fin)
					$cursorPosition)
	) || {
		// Permet de garder le sous-titre affiché avec un fondu de dispiration lorsqu'il n'y a plus de sous-titre
		id: '-1',
		start: 0,
		end: 0,
		text: ''
	};

	let subtitleTextSize = 1;

	onMount(() => {
		window.addEventListener('resize', calculateSubtitleTextSize);
		calculateSubtitleTextSize();
	});

	onDestroy(() => {
		window.removeEventListener('resize', calculateSubtitleTextSize);
	});

	$: $currentProject.projectSettings.subtitlesTracksSettings[subtitleLanguage].fontSize,
		calculateSubtitleTextSize();

	async function calculateSubtitleTextSize() {
		if (videoComponent && videoComponent.offsetWidth) {
			// tant que videoComponent.videoWidth === 0 on attend que la vidéo charge
			while (videoComponent.videoWidth === 0) {
				await new Promise((resolve) => setTimeout(resolve, 100));
			}

			const videoDimensions = getDisplayedVideoSize(videoComponent);
			videoWidth = videoDimensions.displayedWidth;
			videoHeight = videoDimensions.displayedHeight;

			// Calcul la taille de la police pour les sous-titres
			subtitleTextSize =
				videoWidth /
				(140 - $currentProject.projectSettings.subtitlesTracksSettings[subtitleLanguage].fontSize);
		}
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
		videoHeight *
		($currentProject.projectSettings.subtitlesTracksSettings[subtitleLanguage].verticalPosition /
			100)}
	<!-- Calcul permettant de calculer la bonne largeur du texte en fonction de la taille de la vidéo -->
	{@const subtitleHorizontalPadding =
		videoWidth *
		($currentProject.projectSettings.subtitlesTracksSettings[subtitleLanguage].horizontalPadding /
			100)}

	{#key currentSubtitle.id}
		<!-- Si on cache la barre de controle alors la vidéo prend toute la height, sinon on soustrait la taille de la barre -->
		<div
			class={'inset-0  absolute left-1/2 -translate-x-1/2 ' + (hideControls ? '' : 'bottom-16')}
			style={`width: ${videoWidth}px; padding: 0px ${subtitleHorizontalPadding}px; top: ${subtitleVerticalPosition}px;`}
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
						`}
				>
					{#if subtitleLanguage === 'arabic'}
						{currentSubtitle.text}
					{:else if currentSubtitle.translations !== undefined}
						{currentSubtitle.translations[subtitleLanguage]}
					{/if}
				</p>
			</div>
		</div>
	{/key}
{/if}

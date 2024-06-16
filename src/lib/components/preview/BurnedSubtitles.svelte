<script lang="ts">
	import type { SubtitleClip } from '$lib/classes/Timeline';
	import { getDisplayedVideoSize } from '$lib/ext/HtmlExt';
	import { currentProject } from '$lib/stores/ProjectStore';
	import { cursorPosition } from '$lib/stores/TimelineStore';
	import { onDestroy, onMount } from 'svelte';
	import { fade } from 'svelte/transition';

	export let currentSubtitle: SubtitleClip;
	export let hideControls = false;
	export let videoComponent: HTMLVideoElement;
	export let subtitleLanguage: string;

	let videoWidth = 0;

	$: currentSubtitle = $currentProject.timeline.subtitlesTracks[0].clips.find(
		(subtitle) =>
			(subtitle.start === 0 &&
				subtitle.start <= $cursorPosition &&
				subtitle.end >= $cursorPosition) ||
			(subtitle.start > 0 &&
				subtitle.start - 1000 < $cursorPosition &&
				subtitle.end >= $cursorPosition)
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

	function calculateSubtitleTextSize() {
		if (videoComponent && videoComponent.offsetWidth) {
			videoWidth = getDisplayedVideoSize(videoComponent).displayedWidth;

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
		$currentProject.projectSettings.subtitlesTracksSettings[subtitleLanguage].outlineWidth}
	{@const subtitleOutlineColor =
		$currentProject.projectSettings.subtitlesTracksSettings[subtitleLanguage].outlineColor}
	{@const subtitleVerticalPosition =
		$currentProject.projectSettings.subtitlesTracksSettings[subtitleLanguage].verticalPosition}
	{@const subtitleHorizontalPadding =
		$currentProject.projectSettings.subtitlesTracksSettings[subtitleLanguage].horizontalPadding}

	{#key currentSubtitle.id}
		<!-- Si on cache la barre de controle alors la vidéo prend toute la height, sinon on soustrait la taille de la barre -->
		<div
			class={'inset-0 absolute overflow-hidden left-1/2 -translate-x-1/2 ' +
				(hideControls ? '' : 'bottom-16')}
			style={`width: ${videoWidth}px; padding: 0px ${subtitleHorizontalPadding}px; top: ${subtitleVerticalPosition}px;`}
			in:fade={{
				duration: $currentProject.projectSettings.globalSubtitlesSettings.fadeDuration,
				delay: $currentProject.projectSettings.globalSubtitlesSettings.fadeDuration
			}}
			out:fade={{ duration: $currentProject.projectSettings.globalSubtitlesSettings.fadeDuration }}
		>
			<div class="flex items-center justify-center h-full">
				<p
					class="arabic text-center"
					style="font-size: {subtitleTextSize}px;
            
            text-shadow: 
                0 0 {subtitleOutlineWidth}px {subtitleOutlineColor}, 
                0 0 {subtitleOutlineWidth}px {subtitleOutlineColor}, 
                0 0 {subtitleOutlineWidth}px {subtitleOutlineColor}, 
                0 0 {subtitleOutlineWidth}px {subtitleOutlineColor}, 
                0 0 {subtitleOutlineWidth}px {subtitleOutlineColor}, 
                0 0 {subtitleOutlineWidth}px {subtitleOutlineColor}, 
                0 0 {subtitleOutlineWidth}px {subtitleOutlineColor}, 
                0 0 {subtitleOutlineWidth}px {subtitleOutlineColor}, 
                0 0 {subtitleOutlineWidth}px {subtitleOutlineColor}, 
                0 0 {subtitleOutlineWidth}px {subtitleOutlineColor}, 
                0 0 {subtitleOutlineWidth}px {subtitleOutlineColor}, 
                0 0 {subtitleOutlineWidth}px {subtitleOutlineColor}, 
                0 0 {subtitleOutlineWidth}px {subtitleOutlineColor};
            "
				>
					{currentSubtitle.text}
				</p>
			</div>
		</div>
	{/key}
{/if}

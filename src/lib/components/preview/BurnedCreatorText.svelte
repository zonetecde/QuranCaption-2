<script>
	import { calculateFontSize } from '$lib/ext/Utilities';
	import { videoDimensions } from '$lib/stores/LayoutStore';

	import { currentProject } from '$lib/stores/ProjectStore';
	import { onDestroy, onMount } from 'svelte';

	let subtitleTextSize = 1;

	$: $videoDimensions, calculateSubtitleTextSize();

	async function calculateSubtitleTextSize() {
		// Calcul la taille de la police pour les sous-titres
		subtitleTextSize = calculateFontSize(
			$currentProject.projectSettings.globalSubtitlesSettings.creatorText.fontSize
		);
	}
</script>

{#if $currentProject.projectSettings.globalSubtitlesSettings.creatorText.enable}
	<!-- Calcul permettant de calculer la bonne hauteur en fonction de la taille de la vidéo -->
	{@const subtitleVerticalPosition =
		$videoDimensions.height *
		($currentProject.projectSettings.globalSubtitlesSettings.creatorText.verticalPosition / 100)}
	<!-- Calcul permettant de calculer la bonne largeur du texte en fonction de la taille de la vidéo -->
	{@const subtitleHorizontalPadding =
		$videoDimensions.width *
		($currentProject.projectSettings.globalSubtitlesSettings.horizontalPadding / 100)}
	{@const enableOutline =
		$currentProject.projectSettings.globalSubtitlesSettings.creatorText.outline}

	<div
		class="absolute bottom-0 left-1/2 -translate-x-1/2"
		style={`width: ${$videoDimensions.width}px; padding: 0px ${subtitleHorizontalPadding}px; top: ${subtitleVerticalPosition}px;`}
	>
		<div class="flex items-center justify-center h-full">
			<p
				class="arabic text-center"
				style={`font-size: ${subtitleTextSize}px; ${
					enableOutline ? `text-shadow: ` + `0 0 2px black,`.repeat(12) + `0 0 2px black;` : ''
				} opacity: ${
					$currentProject.projectSettings.globalSubtitlesSettings.creatorText.opacity
				}; color: ${$currentProject.projectSettings.globalSubtitlesSettings.creatorText.color};
        ${`font-family: ${$currentProject.projectSettings.globalSubtitlesSettings.creatorText.fontFamily}`}`}
			>
				{$currentProject.projectSettings.globalSubtitlesSettings.creatorText.text}
			</p>
		</div>
	</div>
{/if}

<script>
	import { videoDimensions } from '$lib/stores/LayoutStore';

	import { currentProject } from '$lib/stores/ProjectStore';
</script>

{#if $currentProject.projectSettings.globalSubtitlesSettings.creatorText.enable}
	<!-- Calcul permettant de calculer la bonne hauteur en fonction de la taille de la vidéo -->
	{@const subtitleVerticalPosition =
		$currentProject.projectSettings.globalSubtitlesSettings.creatorText.verticalPosition}
	<!-- Calcul permettant de calculer la bonne largeur du texte en fonction de la taille de la vidéo -->
	{@const enableOutline =
		$currentProject.projectSettings.globalSubtitlesSettings.creatorText.outline}
	{@const subtitleTextSize =
		$currentProject.projectSettings.globalSubtitlesSettings.creatorText.fontSize}
	<div
		class="absolute bottom-0 left-1/2 -translate-x-1/2"
		style={`top: ${subtitleVerticalPosition}px;`}
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
				{@html $currentProject.projectSettings.globalSubtitlesSettings.creatorText.text.replace(
					/\n/g,
					'<br>'
				)}
			</p>
		</div>
	</div>
{/if}

<script lang="ts">
	import { PredefinedSubtitleClip, TrackType, Translation } from '$lib/classes';
	import { globalState } from '$lib/runes/main.svelte';
	import { untrack } from 'svelte';

	const fadeDuration = $derived(() => {
		return globalState.getVideoStyle.getStyle('animation', 'fade-duration').value as number;
	});

	$inspect(fadeDuration());

	let getTimelineSettings = $derived(() => {
		return globalState.currentProject!.projectEditorState.timeline;
	});

	let currentSubtitle = $derived(() => {
		const _ = getTimelineSettings().cursorPosition;
		return untrack(() => {
			return globalState.getSubtitleTrack.getCurrentSubtitleToDisplay();
		});
	});

	let currentSubtitleTranslations = $derived(() => {
		if (!currentSubtitle()) return [];
		return currentSubtitle()!.translations;
	});

	// Calcul de l'opacité des sous-titres
	let subtitleOpacity = $derived(() => {
		const subtitle = currentSubtitle();
		if (!subtitle) return 0;

		let maxOpacity = globalState.getVideoStyle.getStyle('effects', 'opacity').value as number;

		const currentTime = getTimelineSettings().cursorPosition;
		const endTime = subtitle.endTime;
		const timeLeft = endTime - currentTime;
		const halfFade = fadeDuration() / 2;

		if (timeLeft <= halfFade) {
			return Math.max(0, (timeLeft / halfFade) * maxOpacity);
		}

		const startTime = subtitle.startTime;
		const timeSinceStart = currentTime - startTime;

		if (timeSinceStart <= halfFade) {
			return Math.min(maxOpacity, (timeSinceStart / halfFade) * maxOpacity);
		}

		return maxOpacity;
	});

	let globalCss = $derived(() => {
		return globalState.getVideoStyle.generateCSS();
	});

	let globalTailwind = $derived(() => {
		return globalState.getVideoStyle.generateTailwind();
	});

	let helperStyles = $derived(() => {
		let classes = ' ';

		// Si on a certains styles qu'on modifie, on ajoute des styles pour afficher ce qu'ils font
		if (
			globalState.sectionsState['width'].extended ||
			globalState.sectionsState['max-height'].extended
		) {
			classes += 'bg-[#11A2AF] ';
		}

		return classes;
	});

	let lastSubtitleId = 0;

	/**
	 * Gère le max-height (fit on N lines) et la taille de police réactive des sous-titres
	 */
	$effect(() => {
		currentSubtitle()!.id;

		// si le sous-titre actuel n'a pas changé (pendant la lecture vidéo)
		if (
			currentSubtitle()!.id === lastSubtitleId &&
			globalState.currentProject!.projectEditorState.videoPreview.isPlaying
		)
			return;
		lastSubtitleId = currentSubtitle()!.id;

		globalState.currentProject!.projectEditorState.timeline.movePreviewTo;
		globalState.getVideoStyle.getStyle('text', 'max-height').value;
		globalState.getVideoStyle.getStyle('text', 'font-size').value;

		untrack(async () => {
			if (
				globalState.getVideoStyle.getStyle('text', 'max-height').value !== 'none' ||
				currentSubtitle()!.id
			) {
				// Make the font-size responsive
				const maxHeight = globalState.getVideoStyle.getStyle('text', 'max-height').value as string;
				const maxHeightValue = parseFloat(maxHeight);

				let fontSize = globalState.getVideoStyle.getStyle('text', 'font-size').value as number;

				globalState.getVideoStyle.setStyle('text', 'font-size-reactive', fontSize);

				await new Promise((resolve) => {
					setTimeout(resolve, 1); // Attendre un peu pour que le DOM se mette à jour
				});

				const subtitles = document.querySelectorAll('.subtitle');
				subtitles.forEach(async (subtitle) => {
					// Tant que la hauteur du texte est supérieure à la hauteur maximale, on réduit la taille de la police
					while (subtitle.scrollHeight > maxHeightValue && fontSize > 1) {
						fontSize -= 5;

						globalState.getVideoStyle.setStyle('text', 'font-size-reactive', fontSize);

						await new Promise((resolve) => {
							setTimeout(resolve, 1); // Attendre un peu pour que le DOM se mette à jour
						});
					}
				});
			}
		});
	});
</script>

<div class="w-full h-full">
	<div class="absolute inset-0 flex flex-col items-center justify-center" id="subtitles-container">
		{#if currentSubtitle() && currentSubtitle()!.id}
			<p
				class={'arabic absolute subtitle ' + globalTailwind() + helperStyles()}
				style="opacity: {subtitleOpacity()}; {globalCss()}"
			>
				{currentSubtitle()!.text}
			</p>

			<!-- {#each Object.keys(currentSubtitleTranslations()!) as edition}
				{@const translation = (currentSubtitleTranslations()! as Record<string, Translation>)[
					edition
				]}

				<p class="translation absolute" style="opacity: {subtitleOpacity()};">{translation.text}</p>
			{/each} -->
		{/if}
	</div>
</div>

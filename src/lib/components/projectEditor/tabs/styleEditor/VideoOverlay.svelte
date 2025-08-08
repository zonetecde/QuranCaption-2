<script lang="ts">
	import { PredefinedSubtitleClip, TrackType, Translation } from '$lib/classes';
	import { globalState } from '$lib/runes/main.svelte';
	import { untrack } from 'svelte';

	const fadeDuration = $derived(() => {
		return globalState.getVideoStyle.getStyle('global', 'animation', 'fade-duration')
			.value as number;
	});

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
	let subtitleOpacity = $derived((target: string) => {
		const subtitle = currentSubtitle();
		if (!subtitle) return 0;

		let maxOpacity = globalState.getVideoStyle.getStyle(target, 'effects', 'opacity')
			.value as number;

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

	let getCss = $derived((target: string) => {
		return globalState.getVideoStyle.generateCSS(target);
	});

	let getTailwind = $derived((target: string) => {
		return globalState.getVideoStyle.generateTailwind(target);
	});

	let helperStyles = $derived(() => {
		let classes = ' ';

		// Si on a certains styles qu'on modifie, on ajoute des styles pour afficher ce qu'ils font
		if (
			globalState.getSectionsState['width'] &&
			(globalState.getSectionsState['width'].extended ||
				globalState.getSectionsState['max-height'].extended)
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
		if (!currentSubtitle()) return;

		currentSubtitle()!.id;

		// si le sous-titre actuel n'a pas changé (pendant la lecture vidéo)
		if (
			currentSubtitle()!.id === lastSubtitleId &&
			globalState.currentProject!.projectEditorState.videoPreview.isPlaying
		)
			return;
		lastSubtitleId = currentSubtitle()!.id;

		globalState.currentProject!.projectEditorState.timeline.movePreviewTo;
		globalState.getVideoStyle.getStyle('arabic', 'text', 'max-height').value;
		globalState.getVideoStyle.getStyle('arabic', 'text', 'font-size').value;

		untrack(async () => {
			let targets = ['arabic', ...Object.keys(currentSubtitleTranslations()!)];

			targets.forEach(async (target) => {
				if (
					globalState.getVideoStyle.getStyle(target, 'text', 'max-height').value !== 'none' ||
					currentSubtitle()!.id
				) {
					// Make the font-size responsive
					const maxHeight = globalState.getVideoStyle.getStyle(target, 'text', 'max-height')
						.value as string;
					const maxHeightValue = parseFloat(maxHeight);

					let fontSize = globalState.getVideoStyle.getStyle(target, 'text', 'font-size')
						.value as number;

					globalState.getVideoStyle.setStyle(target, 'text', 'font-size-reactive', fontSize);

					await new Promise((resolve) => {
						setTimeout(resolve, 1); // Attendre un peu pour que le DOM se mette à jour
					});

					const subtitles = document.querySelectorAll('.' + target);
					subtitles.forEach(async (subtitle) => {
						// Tant que la hauteur du texte est supérieure à la hauteur maximale, on réduit la taille de la police
						while (subtitle.scrollHeight > maxHeightValue && fontSize > 1) {
							fontSize -= 5;

							globalState.getVideoStyle.setStyle(target, 'text', 'font-size-reactive', fontSize);

							await new Promise((resolve) => {
								setTimeout(resolve, 1); // Attendre un peu pour que le DOM se mette à jour
							});
						}
					});
				}
			});
		});
	});
</script>

<div class="w-full h-full">
	<div class="absolute inset-0 flex flex-col items-center justify-center" id="subtitles-container">
		{#if currentSubtitle() && currentSubtitle()!.id}
			<p
				class={'arabic absolute subtitle ' + getTailwind('arabic') + helperStyles()}
				style="opacity: {subtitleOpacity('arabic')}; {getCss('arabic')}"
			>
				{currentSubtitle()!.text}
			</p>

			{#each Object.keys(currentSubtitleTranslations()!) as edition}
				{@const translation = (currentSubtitleTranslations()! as Record<string, Translation>)[
					edition
				]}

				{#if globalState.getVideoStyle.styles[edition]}
					<p
						class={'translation absolute subtitle ' +
							edition +
							' ' +
							getTailwind(edition) +
							helperStyles()}
						style="opacity: {subtitleOpacity(edition)}; {getCss(edition)}"
					>
						{translation.text}
					</p>
				{/if}
			{/each}
		{/if}
	</div>
</div>

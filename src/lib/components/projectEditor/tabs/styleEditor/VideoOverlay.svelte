<script lang="ts">
	import {
		CustomTextClip,
		PredefinedSubtitleClip,
		SubtitleClip,
		TrackType,
		Translation
	} from '$lib/classes';
	import { globalState } from '$lib/runes/main.svelte';
	import { untrack } from 'svelte';
	import SurahName from './SurahName.svelte';
	import CustomText from './CustomText.svelte';

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

	// Contient les textes custom à afficher à ce moment précis
	let currentCustomTexts = $derived(() => {
		const _ = getTimelineSettings().cursorPosition;
		return untrack(() => {
			return globalState.getCustomTextTrack.getCurrentClips();
		});
	});

	// Calcul de l'opacité des sous-titres (prend en compte les overrides par clip)
	let subtitleOpacity = $derived((target: string) => {
		const subtitle = currentSubtitle();
		if (!subtitle) return 0;

		const clipId = subtitle.id;
		let maxOpacity = Number(
			globalState.getVideoStyle.getEffectiveValue(target, 'effects', 'opacity', clipId)
		);

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

	let getCss = $derived((target: string, clipId?: number) => {
		return globalState.getVideoStyle.generateCSS(target, clipId);
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
				try {
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

						globalState.getVideoStyle.setStyle(target, 'text', 'reactive-font-size', fontSize);

						await new Promise((resolve) => {
							setTimeout(resolve, 1); // Attendre un peu pour que le DOM se mette à jour
						});

						const subtitles = document.querySelectorAll('.' + target);
						subtitles.forEach(async (subtitle) => {
							// Tant que la hauteur du texte est supérieure à la hauteur maximale, on réduit la taille de la police
							while (subtitle.scrollHeight > maxHeightValue && fontSize > 1) {
								fontSize -= 5;

								globalState.getVideoStyle.setStyle(target, 'text', 'reactive-font-size', fontSize);

								await new Promise((resolve) => {
									setTimeout(resolve, 1); // Attendre un peu pour que le DOM se mette à jour
								});
							}
						});
					}
				} catch (error) {}
			});
		});
	});

	let overlaySettings = $derived(() => {
		return {
			enable: globalState.getVideoStyle.getStyle('global', 'overlay', 'overlay-enable').value,
			blur: globalState.getVideoStyle.getStyle('global', 'overlay', 'overlay-blur').value,
			opacity: globalState.getVideoStyle.getStyle('global', 'overlay', 'overlay-opacity').value,
			color: globalState.getVideoStyle.getStyle('global', 'overlay', 'overlay-color').value
		};
	});
</script>

{#if overlaySettings().enable}
	<div
		class="absolute inset-0"
		style="
				background-color: {overlaySettings().color};
				opacity: {overlaySettings().opacity};
			"
	></div>

	<div class="absolute inset-0" style="backdrop-filter: blur({overlaySettings().blur}px);"></div>
{/if}

<div class="w-full h-full">
	<div class="absolute inset-0 flex flex-col items-center justify-center" id="subtitles-container">
		{#if currentSubtitle() && currentSubtitle()!.id}
			<p
				class={'arabic absolute subtitle ' + getTailwind('arabic') + helperStyles()}
				style="opacity: {subtitleOpacity('arabic')}; {getCss('arabic', currentSubtitle()!.id)}"
			>
				{currentSubtitle()!.getText()}
			</p>

			{#each Object.keys(currentSubtitleTranslations()!) as edition}
				{@const translation = (currentSubtitleTranslations()! as Record<string, Translation>)[
					edition
				]}

				{#if globalState.getVideoStyle.styles[edition]}
					<p
						class={`translation absolute subtitle ${edition} ${getTailwind(edition)} ${helperStyles()}`}
						style={`opacity: ${subtitleOpacity(edition)}; ${getCss(edition, currentSubtitle()!.id)}`}
					>
						{#if translation.type === 'verse'}
							{translation.getText(edition, (currentSubtitle() as SubtitleClip)!)}
						{:else}
							{translation.getText()}
						{/if}
					</p>
				{/if}
			{/each}
		{/if}

		<SurahName />

		{#each currentCustomTexts() as customText}
			<CustomText customText={(customText as CustomTextClip).category!} />
		{/each}
	</div>
</div>

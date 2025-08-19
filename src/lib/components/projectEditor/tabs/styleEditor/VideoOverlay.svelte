<script lang="ts">
	import {
		CustomTextClip,
		PredefinedSubtitleClip,
		SubtitleClip,
		TrackType,
		Translation
	} from '$lib/classes';
	import { globalState } from '$lib/runes/main.svelte';
	import { verticalDrag } from '$lib/services/verticalDrag';
	import { untrack } from 'svelte';
	import SurahName from './SurahName.svelte';
	import CustomText from './CustomText.svelte';
	import ReciterName from './ReciterName.svelte';

	const fadeDuration = $derived(() => {
		return globalState.getVideoStyle.getStylesOfTarget('global').findStyle('fade-duration')!
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
			globalState.getVideoStyle.getStylesOfTarget(target).getEffectiveValue('opacity', clipId)
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
		return globalState.getVideoStyle.getStylesOfTarget(target).generateCSS(clipId);
	});

	let getTailwind = $derived((target: string) => {
		return globalState.getVideoStyle.getStylesOfTarget(target).generateTailwind();
	});

	let helperStyles = $derived(() => {
		let classes = ' ';

		// Si on a certains styles qu'on modifie, on ajoute des styles pour afficher ce qu'ils font
		if (
			globalState.getSectionsState['width'] &&
			(globalState.getSectionsState['width'].extended ||
				globalState.getSectionsState['max-height'].extended)
		) {
			classes += 'bg-[#11A2AF]/50 ';
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
			globalState.getCurrentVideoPreviewState.isPlaying
		)
			return;
		lastSubtitleId = currentSubtitle()!.id;

		globalState.currentProject!.projectEditorState.timeline.movePreviewTo;
		globalState.getVideoStyle.getStylesOfTarget('arabic').findStyle('max-height')!.value;
		globalState.getVideoStyle.getStylesOfTarget('arabic').findStyle('font-size')!.value;

		untrack(async () => {
			let targets = ['arabic', ...Object.keys(currentSubtitleTranslations()!)];

			targets.forEach(async (target) => {
				try {
					if (
						globalState.getVideoStyle.getStylesOfTarget(target).findStyle('max-height')!.value !==
							'none' ||
						currentSubtitle()!.id
					) {
						// Make the font-size responsive
						const maxHeight = globalState.getVideoStyle
							.getStylesOfTarget(target)
							.findStyle('max-height')!.value as string;
						const maxHeightValue = parseFloat(maxHeight);

						let fontSize = globalState.getVideoStyle
							.getStylesOfTarget(target)
							.findStyle('font-size')!.value as number;

						globalState.getVideoStyle
							.getStylesOfTarget(target)
							.setStyle('reactive-font-size', fontSize);

						await new Promise((resolve) => {
							setTimeout(resolve, 1); // Attendre un peu pour que le DOM se mette à jour
						});

						const subtitles = document.querySelectorAll('.' + target);
						subtitles.forEach(async (subtitle) => {
							// Tant que la hauteur du texte est supérieure à la hauteur maximale, on réduit la taille de la police
							while (subtitle.scrollHeight > maxHeightValue && fontSize > 1) {
								fontSize -= 5;

								globalState.getVideoStyle
									.getStylesOfTarget(target)
									.setStyle('reactive-font-size', fontSize);

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
			enable: globalState.getVideoStyle.getStylesOfTarget('global').findStyle('overlay-enable')!
				.value,
			blur: globalState.getVideoStyle.getStylesOfTarget('global').findStyle('overlay-blur')!.value,
			opacity: globalState.getVideoStyle.getStylesOfTarget('global').findStyle('overlay-opacity')!
				.value,
			color: globalState.getVideoStyle.getStylesOfTarget('global').findStyle('overlay-color')!.value
		};
	});

	// Drag vertical factorisé via l'action verticalDrag
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
				use:verticalDrag={{
					getInitial: () =>
						Number(
							globalState.getVideoStyle.getStylesOfTarget('arabic').findStyle('vertical-position')!
								.value
						),
					apply: (v: number) =>
						globalState.getVideoStyle.getStylesOfTarget('arabic').setStyle('vertical-position', v),
					min: globalState.getVideoStyle.getStylesOfTarget('arabic').findStyle('vertical-position')!
						.valueMin,
					max: globalState.getVideoStyle.getStylesOfTarget('arabic').findStyle('vertical-position')!
						.valueMax
				}}
				class={'arabic absolute subtitle select-none ' + getTailwind('arabic') + helperStyles()}
				style="opacity: {subtitleOpacity('arabic')}; {getCss('arabic', currentSubtitle()!.id)}"
			>
				{currentSubtitle()!.getText()}
			</p>

			{#each Object.keys(currentSubtitleTranslations()!) as edition}
				{@const translation = (currentSubtitleTranslations()! as Record<string, Translation>)[
					edition
				]}

				{#if globalState.getVideoStyle.doesTargetStyleExist(edition)}
					<p
						use:verticalDrag={{
							getInitial: () =>
								Number(
									globalState.getVideoStyle
										.getStylesOfTarget(edition)
										.findStyle('vertical-position')!.value
								),
							apply: (v: number) =>
								globalState.getVideoStyle
									.getStylesOfTarget(edition)
									.setStyle('vertical-position', v),
							min: globalState.getVideoStyle
								.getStylesOfTarget(edition)
								.findStyle('vertical-position')!.valueMin,
							max: globalState.getVideoStyle
								.getStylesOfTarget(edition)
								.findStyle('vertical-position')!.valueMax
						}}
						class={`translation absolute subtitle select-none ${edition} ${getTailwind(edition)} ${helperStyles()}`}
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
		<ReciterName />

		{#each currentCustomTexts() as customText}
			<CustomText customText={(customText as CustomTextClip).category!} />
		{/each}
	</div>
</div>

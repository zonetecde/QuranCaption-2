<script lang="ts">
	import { CustomTextClip, ProjectEditorTabs, SubtitleClip, Translation } from '$lib/classes';
	import type { StyleCategoryName } from '$lib/classes/VideoStyle.svelte';
	import { globalState } from '$lib/runes/main.svelte';
	import { verticalDrag } from '$lib/services/verticalDrag';
	import { untrack } from 'svelte';
	import ReciterName from '../tabs/styleEditor/ReciterName.svelte';
	import SurahName from '../tabs/styleEditor/SurahName.svelte';
	import VerseNumber from '../tabs/styleEditor/VerseNumber.svelte';
	import CustomText from '../tabs/styleEditor/CustomText.svelte';

	const fadeDuration = $derived(() => {
		return globalState.getStyle('global', 'fade-duration').value as number;
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

	let getCss = $derived((target: string, clipId?: number, excludedCategories: string[] = []) => {
		return globalState.getVideoStyle
			.getStylesOfTarget(target)
			.generateCSS(clipId, excludedCategories);
	});

	let getTailwind = $derived((target: string) => {
		return globalState.getVideoStyle.getStylesOfTarget(target).generateTailwind();
	});

	let helperStyles = $derived((target: string) => {
		// Vérifie que la sélection actuelle correspond à la cible
		if (
			globalState.currentProject?.projectEditorState.currentTab === ProjectEditorTabs.Style &&
			(globalState.getStylesState.currentSelection === target ||
				(globalState.getStylesState.currentSelection === 'translation' &&
					globalState.getStylesState.currentSelectionTranslation === target))
		) {
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
		}
		return '';
	});

	let lastSubtitleId = 0;

	/**
	 * Gère le max-height (fit on N lines) et la taille de police réactive des sous-titres
	 */
	$effect(() => {
		if (!currentSubtitle()) return;

		currentSubtitle()!.id;

		// si le sous-titre actuel n'a pas changé (pendant la lecture vidéo)
		if (currentSubtitle()!.id === lastSubtitleId && globalState.getVideoPreviewState.isPlaying)
			return;
		lastSubtitleId = currentSubtitle()!.id;

		globalState.getTimelineState.movePreviewTo;
		globalState.getStyle('arabic', 'max-height').value;
		globalState.getStyle('arabic', 'font-size').value;

		untrack(async () => {
			let targets = ['arabic', ...Object.keys(currentSubtitleTranslations()!)];

			targets.forEach(async (target) => {
				try {
					if (
						globalState.getStyle(target, 'max-height').value !== 'none' ||
						currentSubtitle()!.id
					) {
						// Make the font-size responsive
						const maxHeight = globalState.getStyle(target, 'max-height')!.value as string;
						const maxHeightValue = parseFloat(maxHeight);

						let fontSize = globalState.getStyle(target, 'font-size').value as number;

						globalState.getVideoStyle
							.getStylesOfTarget(target)
							.setStyle('reactive-font-size', fontSize);

						await new Promise((resolve) => {
							setTimeout(resolve, 1); // Attendre un peu pour que le DOM se mette à jour
						});

						const subtitles = document.querySelectorAll('.' + CSS.escape(target) + '.subtitle');
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
			enable: globalState.getStyle('global', 'overlay-enable')!.value,
			blur: globalState.getStyle('global', 'overlay-blur')!.value,
			opacity: globalState.getStyle('global', 'overlay-opacity')!.value,
			color: globalState.getStyle('global', 'overlay-color')!.value
		};
	});
</script>

<div class="inset-0 absolute" style="" id="overlay">
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
		<div
			class="absolute inset-0 flex flex-col items-center justify-center"
			id="subtitles-container"
		>
			{#if currentSubtitle()}
				{@const subtitle = currentSubtitle()}
				{#if subtitle && subtitle.id}
					<!-- Background du sous-titre -->
					<div
						class={'arabic absolute subtitle select-none' +
							getTailwind('arabic') +
							helperStyles('arabic')}
						style="{getCss('arabic', subtitle.id)};"
					></div>

					<p
						ondblclick={() => {
							globalState.getVideoStyle.highlightCategory('arabic', 'general');
						}}
						use:verticalDrag={{
							target: 'arabic',
							styleId: 'vertical-position'
						}}
						class={'arabic absolute subtitle select-none ' +
							getTailwind('arabic') +
							helperStyles('arabic')}
						style="opacity: {subtitleOpacity('arabic')}; {getCss('arabic', subtitle.id, [
							'background',
							'border'
						])};"
					>
						{subtitle.getText()}
					</p>
				{/if}

				{#each Object.keys(currentSubtitleTranslations()!) as edition}
					{@const translation = (currentSubtitleTranslations()! as Record<string, Translation>)[
						edition
					]}

					{#if globalState.getVideoStyle.doesTargetStyleExist(edition)}
						<!-- Background du sous-titre -->
						<div
							class={'translation absolute subtitle select-none' +
								getTailwind(edition) +
								helperStyles(edition)}
							style="{getCss(edition)};"
						></div>

						<p
							ondblclick={() => {
								globalState.getVideoStyle.highlightCategory(
									'translation',
									edition as StyleCategoryName
								);
							}}
							use:verticalDrag={{
								target: edition,
								styleId: 'vertical-position'
							}}
							class={`translation absolute subtitle select-none ${edition} ${getTailwind(edition)} ${helperStyles(edition)}`}
							style={`opacity: ${subtitleOpacity(edition)}; ${getCss(edition, subtitle!.id, [
								'background',
								'border'
							])};`}
						>
							{#if translation.type === 'verse'}
								{translation.getText(edition, (subtitle as SubtitleClip)!)}
							{:else}
								{translation.getText()}
							{/if}
						</p>
					{/if}
				{/each}
			{/if}

			<SurahName />
			<ReciterName />

			{#if currentSubtitle() && currentSubtitle() instanceof SubtitleClip}
				<VerseNumber
					currentSurah={(currentSubtitle() as SubtitleClip).surah}
					currentVerse={(currentSubtitle() as SubtitleClip).verse}
				/>
			{/if}

			{#each currentCustomTexts() as customText}
				<CustomText customText={(customText as CustomTextClip).category!} />
			{/each}
		</div>
	</div>
</div>

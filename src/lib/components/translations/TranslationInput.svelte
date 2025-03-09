<script lang="ts">
	import { getAssetFromId } from '$lib/ext/Id';
	import { milisecondsToMMSS, type SubtitleClip } from '$lib/models/Timeline';
	import {
		audio,
		currentlyEditedSubtitleId,
		currentPage,
		isFetchingIA,
		onlyShowSubtitlesThatAreNotFullVerses,
		onlyShowVersesWhoseTranslationsNeedReview,
		playedSubtitleId,
		setCurrentPage,
		setSubtitleToEdit
	} from '$lib/stores/LayoutStore';
	import { currentProject } from '$lib/stores/ProjectStore';
	import { Mushaf, getEditionFromName, getWordByWordTranslation } from '$lib/stores/QuranStore';
	import { downloadTranslationForVerse } from '$lib/stores/QuranStore';
	import { text } from '@sveltejs/kit';
	import { convertFileSrc } from '@tauri-apps/api/tauri';
	import { onMount } from 'svelte';
	import toast from 'svelte-french-toast';
	import EditSubtitleButton from '../common/EditSubtitleButton.svelte';
	import PlaySubtitleAudioButton from '../common/PlaySubtitleAudioButton.svelte';
	import IndividualSubtitleSettings from '../subtitles/subtitlesSettingsUI/IndividualSubtitleSettings.svelte';
	import CustomizeSubtitleStyleButton from '../common/CustomizeSubtitleStyleButton.svelte';

	export let subtitle: SubtitleClip;
	export let subtitleIndex: number;

	let wbwTranslation: string[] = [];
	let isIncomplete = false;
	let showCustomizationSettings = false;

	onMount(async () => {
		if (subtitle.surah === -1 || subtitle.verse === -1) {
			isIncomplete = true;

			return; // Si c'est un silence, une basmala ou autre
		}

		// Télécharge la traduction mot à mot
		wbwTranslation = await getWordByWordTranslation(subtitle.surah, subtitle.verse);

		// Regarde si les mots sélectionnés dans le texte arabe est complet
		if (
			subtitle.firstWordIndexInVerse !== 0 ||
			subtitle.lastWordIndexInVerse !==
				$Mushaf.surahs[subtitle.surah - 1].verses[subtitle.verse - 1].text.split(' ').length - 1
		) {
			isIncomplete = true;
		}
	});

	/**
	 * Check if the current subtitle is the same verse than the previous subtitle.
	 * @param {number} subtitleIndex - The index of the subtitle.
	 */
	function isSameVerseThanPreviousSubtitle(subtitleIndex: number): boolean {
		let track = $currentProject.timeline.subtitlesTracks[0];

		if (subtitleIndex === 0) return false;

		let i: number = 1;
		// ne compte pas les silences/subtitles speciaux
		while (track.clips[subtitleIndex - i].verse === -1) {
			i++;

			if (subtitleIndex - i < 0) return false;
		}

		return (
			track.clips[subtitleIndex - i].verse === track.clips[subtitleIndex].verse &&
			track.clips[subtitleIndex - i].surah === track.clips[subtitleIndex].surah
		);
	}

	async function handleRefreshTranslation(translation: string) {
		// @ts-ignore
		subtitle.translations[translation] = await downloadTranslationForVerse(
			translation,
			subtitle.surah,
			subtitle.verse
		);

		// If we reset this translations, this means we might did things wrong
		// So reset all the next translations of this verse
		for (
			let i = subtitleIndex + 1;
			i < $currentProject.timeline.subtitlesTracks[0].clips.length;
			i++
		) {
			const element = $currentProject.timeline.subtitlesTracks[0].clips[i];

			if (
				element.verse === subtitle.verse &&
				element.surah === subtitle.surah &&
				!element.hadItTranslationEverBeenModified
			) {
				element.translations[translation] = await downloadTranslationForVerse(
					translation,
					element.surah,
					element.verse
				);
				changeText(element.id, translation);
			}
		}

		changeText(subtitle.id, translation);
	}

	function changeText(subtitleId: string, translation: string) {
		const subtitle = $currentProject.timeline.subtitlesTracks[0].clips.find(
			(clip) => clip.id === subtitleId
		);

		if (!subtitle) return;

		const textarea = document.getElementById(
			'textarea-translation-' + subtitleId + '-' + translation
		);
		textarea!.textContent = subtitle.translations[translation];
	}

	/**
	 * Handles the validation of a translation input.
	 *
	 * @param {any} e - The event object.
	 * @param {string} translationId - The ID of the translation.
	 */
	async function handleValidation(e: any, translationId: string) {
		// Trim the text of this subtitle
		subtitle.translations[translationId] = subtitle.translations[translationId].trim();
		changeText(subtitle.id, translationId);
		subtitle.hadItTranslationEverBeenModified = true;

		// Trim all subsequent subtitles that come after the Arabic text of the current subtitle
		// to facilitate the translator's work
		for (
			let i = subtitleIndex + 1;
			i < $currentProject.timeline.subtitlesTracks[0].clips.length;
			i++
		) {
			const element = $currentProject.timeline.subtitlesTracks[0].clips[i];

			try {
				if (element.verse === subtitle.verse && element.surah === subtitle.surah) {
					// If the text is the same, copy the translation
					if (element.text === subtitle.text) {
						// Copy the translation from the current subtitle because it is the same text
						element.translations[translationId] = subtitle.translations[translationId];
						element.hadItTranslationEverBeenModified = true; // Mark the translation as modified
						changeText(element.id, translationId);

						continue;
					}

					// Else, check if the translation has not been modified for this verse to avoid overwriting it
					if (
						(await downloadTranslationForVerse(translationId, element.surah, element.verse)) ===
						element.translations[translationId]
					) {
						if (
							subtitle.lastWordIndexInVerse + 1 === element.firstWordIndexInVerse &&
							subtitle.text !== element.text
						) {
							// Get the last translation of this verse, just before the Arabic text of this subtitle
							let lastTranslations = $currentProject.timeline.subtitlesTracks[0].clips
								.slice(0, i)
								.filter(
									(clip) =>
										clip.verse === subtitle.verse &&
										clip.surah === subtitle.surah &&
										clip.firstWordIndexInVerse < subtitle.firstWordIndexInVerse
								);

							// Remove duplicates of translations based on firstWordIndexInVerse and lastWordIndexInVerse
							// If not done, some translations will be repeated and the offset will be wrong
							const distinct = Array.from(
								new Set(lastTranslations.map((a) => a.firstWordIndexInVerse))
							).map((firstWordIndexInVerse) => {
								return lastTranslations.find(
									(a) => a.firstWordIndexInVerse === firstWordIndexInVerse
								);
							});

							// @ts-ignore
							lastTranslations = distinct;

							// Calculate the offset of the text to remove
							let sum = 0;
							for (const translation of lastTranslations) {
								sum += translation.translations[translationId].length + 1;
							}

							const newTranslation = element.translations[translationId].substring(
								subtitle.translations[translationId].length + sum
							);

							// Check if the newTranslation is not empty and
							// TODO: check if it does not start in the middle of a word - this would
							// obviously be a mistake
							if (newTranslation.trim() !== '') {
								// Remove the already-translated part of the text
								element.translations[translationId] = newTranslation;

								// Change the text of the textarea
								changeText(element.id, translationId);
							}
						}
					}
				}
			} catch (e) {
				// Something went wrong
			}
		}
	}

	$: doesSubtitleNeedReview =
		(subtitle.hadItTranslationEverBeenModified === false ||
			subtitle.hadItTranslationEverBeenModified === undefined) &&
		isIncomplete;
</script>

{#if (!$onlyShowSubtitlesThatAreNotFullVerses && !$onlyShowVersesWhoseTranslationsNeedReview) || ($onlyShowSubtitlesThatAreNotFullVerses && isIncomplete) || ($onlyShowVersesWhoseTranslationsNeedReview && doesSubtitleNeedReview)}
	<!-- ajout dune separation -->
	{#if !isSameVerseThanPreviousSubtitle(subtitleIndex) && subtitleIndex !== 0}
		<div class="h-1 w-full bg-[#7e6d77]"></div>
	{/if}

	<div
		class={'p-2 px-10 relative border-[#413f3f] ' +
			(isIncomplete && !doesSubtitleNeedReview ? 'bg-[#212c23] ' : '') +
			(doesSubtitleNeedReview ? 'bg-[#2c2424] ' : '') +
			(showCustomizationSettings ? 'border-b-2' : '')}
	>
		<div class="absolute top-2 right-[4.5rem]">
			<CustomizeSubtitleStyleButton
				{subtitle}
				onClick={() => (showCustomizationSettings = !showCustomizationSettings)}
			/>
		</div>
		<div class="absolute top-2 right-10">
			<EditSubtitleButton {subtitle} />
		</div>
		<div class="absolute top-2 right-2">
			<PlaySubtitleAudioButton {subtitle} />
		</div>

		<div class="flex justify-between items-start flex-col w-full">
			<p class="text-lg text-left">
				{#if subtitle.surah !== -1 && subtitle.verse !== -1}
					{subtitle.surah}:{subtitle.verse}
				{/if}
				<span class="text-xs">
					{milisecondsToMMSS(subtitle.start)}-{milisecondsToMMSS(subtitle.end)}</span
				>
			</p>

			{#if subtitle.isCustomText}
				<p class="text-lg text-left">Custom text</p>
			{/if}

			<div class="w-full text-4xl mt-4 leading-[3.5rem] flex flex-row-reverse flex-wrap">
				{#each subtitle.text.split(' ') as word, i}
					<div class="flex flex-col relative group">
						<span class="inline-block arabic" style="margin-right: 0.5rem;">{word}</span>
						{#if wbwTranslation[i]}
							<span
								class="text-sm absolute w-max -bottom-10 z-20 -translate-x-1/2 left-1/2 rounded-lg hidden group-hover:inline-block bg-slate-800 p-3"
								style="margin-right: 0.5rem;"
								>{wbwTranslation[subtitle.firstWordIndexInVerse + i]}</span
							>
						{/if}
					</div>
				{/each}
			</div>
		</div>

		<div class="flex flex-col mt-1 gap-y-3">
			{#each $currentProject.projectSettings.addedTranslations as translationId}
				<div>
					<p class="font-bold w-full">{getEditionFromName(translationId)?.language}:</p>

					<div class="flex relative flex-row">
						<!-- svelte-ignore a11y-interactive-supports-focus -->
						<span
							class="input w-full border-2 border-[#535b5e] px-2 py-1 text-[#c5d4c4] text-justify -ml-2 mr-2 outline-none rounded-lg textarea-translation"
							id={'textarea-translation-' + subtitle.id + '-' + translationId}
							role="textbox"
							contenteditable
							bind:textContent={subtitle.translations[translationId]}
							on:keydown={(e) => {
								// Si `enter` est pressé, on va à la prochaine textarea
								if (e.key === 'Enter') {
									e.preventDefault();
									handleValidation(e, translationId);
								}
							}}
						>
						</span>

						<div class="flex flex-row gap-x-1 bg-[#332128] px-2 rounded-md border border-[#1a1013]">
							<button
								class="relative group"
								on:click={() => handleRefreshTranslation(translationId)}
							>
								<svg
									xmlns="http://www.w3.org/2000/svg"
									fill="none"
									viewBox="0 0 24 24"
									stroke-width="1.5"
									stroke="currentColor"
									class="size-6"
								>
									<path
										stroke-linecap="round"
										stroke-linejoin="round"
										d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99"
									/>
								</svg>

								<p
									class="absolute -translate-x-1/2 left-1/2 w-max bg-[#332128] border-[#1a1013] z-50 px-3 -bottom-5 hidden group-hover:inline-block"
								>
									Reset translation
								</p>
							</button>
						</div>
					</div>
				</div>
			{/each}
		</div>

		{#if showCustomizationSettings}
			<br />
			<div class="w-full p-2 border-[#413f3f]">
				<IndividualSubtitleSettings {subtitle} removeBorder={true} />
			</div>
		{/if}
	</div>
{/if}

<script lang="ts">
	import { milisecondsToMMSS, type SubtitleClip } from '$lib/models/Timeline';
	import {
		clearSubtitleToEdit,
		currentlyEditedSubtitleId,
		currentPage,
		setCurrentVideoTime,
		setSubtitleToEdit
	} from '$lib/stores/LayoutStore';
	import { currentProject } from '$lib/stores/ProjectStore';
	import { getEditionFromName } from '$lib/stores/QuranStore';
	import { cursorPosition, scrollToCursor } from '$lib/stores/TimelineStore';
	import { isPreviewPlaying } from '$lib/stores/VideoPreviewStore';
	import toast from 'svelte-french-toast';
	import EditSubtitleButton from '../common/EditSubtitleButton.svelte';
	import PlaySubtitleAudioButton from '../common/PlaySubtitleAudioButton.svelte';
	import IndividualSubtitleSettings from './subtitlesSettingsUI/IndividualSubtitleSettings.svelte';

	export let subtitle: SubtitleClip;
	export let showIndividualCustomizationSettings = false; // Affiche les boutons de customisation de sous-titre individuel (glowing...)
	let leftClicked = false;

	async function handleSubtitleListItemTimingClicked(subtitleStart: number) {
		if ($isPreviewPlaying)
			// move the cursor to the start of the clip
			setCurrentVideoTime.set(subtitleStart / 1000);
		else {
			cursorPosition.set(subtitleStart + 1);
		}

		scrollToCursor();
	}

	function toggleShowIndividualCustomizationSettings() {
		if (showIndividualCustomizationSettings) {
			if (subtitle.isSilence) {
				toast.error('You cannot customize silence subtitles');
				return;
			}

			// ajoute dans $currentProject.projectSettings.individualSubtitlesSettings si n'existe pas
			if (!$currentProject.projectSettings.individualSubtitlesSettings[subtitle.id]) {
				$currentProject.projectSettings.individualSubtitlesSettings[subtitle.id] = {
					glowEffect: false,
					glowColor: '#ff0000',
					glowRadius: 7,
					bold: false,
					italic: false,
					underline: false
				};
			}

			leftClicked = !leftClicked;
		}
	}
</script>

<!-- svelte-ignore a11y-click-events-have-key-events -->
<!-- svelte-ignore a11y-no-static-element-interactions -->
<div
	class={'p-2 border-[#413f3f] relative ' +
		(subtitle.id === $currentlyEditedSubtitleId ? 'bg-[#655429] ' : 'bg-[#1f1f1f] ') +
		(leftClicked ? 'border-x-2 border-t ' : 'border-b-2 ') +
		(showIndividualCustomizationSettings ? 'cursor-pointer' : '')}
	on:click={toggleShowIndividualCustomizationSettings}
>
	{#if $currentPage === 'Subtitles editor'}
		<div class="absolute top-1 right-8">
			<EditSubtitleButton {subtitle} />
		</div>
		<div class="absolute top-1 right-1">
			<PlaySubtitleAudioButton {subtitle} />
		</div>
	{/if}

	<div class="flex flex-col w-full">
		<p class="text-sm text-left">
			{#if subtitle.surah !== -1 && subtitle.verse !== -1}
				<span class="monospace">{subtitle.surah}:{subtitle.verse}</span>
			{/if}
			<button
				tabindex="-1"
				class="outline-none cursor-pointer px-3"
				on:click={() => handleSubtitleListItemTimingClicked(subtitle.start + 1)}
				><small>{milisecondsToMMSS(subtitle.start)} - {milisecondsToMMSS(subtitle.end)}</small
				></button
			>
		</p>
		<p class="arabic text-right w-full pt-4 pb-1">{subtitle.text}</p>
	</div>

	<div class="flex flex-col mt-1">
		{#if !subtitle.isSilence}
			{#each $currentProject.projectSettings.addedTranslations as translation}
				<p class="text-xs text-justify text-[#c5d4c4]">
					<span class="text-[#8cbb8a] font-bold">{getEditionFromName(translation)?.language}:</span>
					{subtitle.translations[translation] ?? 'Downloading...'}
				</p>
			{/each}
		{:else}
			<i class="text-xs text-justify text-[#c5d4c4]">Silence</i>
		{/if}
	</div>
</div>

{#if showIndividualCustomizationSettings && leftClicked}
	<IndividualSubtitleSettings {subtitle} />
{/if}

<script lang="ts">
	import { milisecondsToMMSS, type SubtitleClip } from '$lib/models/Timeline';
	import {
		currentlyCustomizedSubtitleId,
		currentlyEditedSubtitleId,
		currentPage,
		setCurrentVideoTime
	} from '$lib/stores/LayoutStore';
	import { getTextName } from '$lib/stores/OtherTextsStore';
	import {
		currentProject,
		hasSubtitleDefaultIndividualSettings,
		setDefaultIndividualSettingsForSubtitleId
	} from '$lib/stores/ProjectStore';
	import { getEditionFromName } from '$lib/stores/QuranStore';
	import { cursorPosition, scrollToCursor } from '$lib/stores/TimelineStore';
	import { isPreviewPlaying } from '$lib/stores/VideoPreviewStore';
	import CustomizeSubtitleStyleButton from '../common/CustomizeSubtitleStyleButton.svelte';
	import EditSubtitleButton from '../common/EditSubtitleButton.svelte';
	import PlaySubtitleAudioButton from '../common/PlaySubtitleAudioButton.svelte';
	import IndividualSubtitleSettings from './subtitlesSettingsUI/IndividualSubtitleSettings.svelte';

	export let subtitle: SubtitleClip;
	let leftClicked = false;
	let customStyle = '';

	async function handleSubtitleListItemTimingClicked(subtitleStart: number) {
		if ($isPreviewPlaying)
			// move the cursor to the start of the clip
			setCurrentVideoTime.set(subtitleStart / 1000);
		else {
			cursorPosition.set(subtitleStart + 1);
		}

		scrollToCursor();
	}

	$: if ($currentlyCustomizedSubtitleId === subtitle.id) {
		// En fonction de si on est sur la page de Video Editor ou d'édition de sous-titre,
		// on scroll vers le sous-titre d'une manière différente car on n'a pas la même structure de div
		// Dans video editor c'est dans les paramètres de sous-titre à gauche, alors que dans l'édition de sous-titre c'est dans la liste des sous-titres
		// à droite

		// Si on est sur la page d'édition vidéo, on scroll
		let subtitleListDiv = document.getElementById(
			$currentPage === 'Video editor' ? 'subtitle-settings-container' : 'subtitle-list-container'
		);
		// set l'id à la div
		if (subtitleListDiv) {
			// Scroll to the specific subtitle
			const elt = document.getElementById(`subtitle-${$currentlyCustomizedSubtitleId}`);
			if (elt) {
				subtitleListDiv.scrollTop = elt.offsetTop - ($currentPage === 'Video editor' ? 10 : 250);
			}

			currentlyCustomizedSubtitleId.set(undefined);

			if (!hasSubtitleDefaultIndividualSettings(subtitle.id)) {
				setDefaultIndividualSettingsForSubtitleId(subtitle.id);
			}

			leftClicked = true;

			// change temporairement la couleur de fond pour attirer le regard
			customStyle = 'background-color: #544D6B;';
			setTimeout(() => {
				customStyle = '';
			}, 1000);
		}
	}
</script>

<!-- svelte-ignore a11y-click-events-have-key-events -->
<!-- svelte-ignore a11y-no-static-element-interactions -->
<div
	id="subtitle-{subtitle.id}"
	class={'p-2 border-[#413f3f] relative duration-500 ' +
		(subtitle.id === $currentlyEditedSubtitleId ? 'bg-[#655429] ' : 'bg-[#1f1f1f] ') +
		(leftClicked ? 'border-x-2 border-t ' : 'border-b-2 ')}
	style={customStyle}
>
	{#if $currentPage === 'Subtitles editor'}
		<div class="absolute top-1 right-8">
			<EditSubtitleButton {subtitle} />
		</div>
		<div class="absolute top-1 right-[3.75rem]">
			<PlaySubtitleAudioButton {subtitle} />
		</div>
		<div class="absolute top-1 right-1">
			<CustomizeSubtitleStyleButton onClick={() => (leftClicked = !leftClicked)} {subtitle} />
		</div>
	{:else if $currentPage === 'Video editor'}
		<div class="absolute top-1 right-1">
			<CustomizeSubtitleStyleButton onClick={() => (leftClicked = !leftClicked)} {subtitle} />
		</div>
	{/if}

	<div class="flex flex-col w-full">
		<p class="text-sm text-left">
			{#if subtitle.surah > 0 && subtitle.verse > 0}
				<span class="monospace">{subtitle.surah}:{subtitle.verse}</span>
			{:else if subtitle.surah < -1 && subtitle.verse > 0}
				<!-- texte custom -->
				<span class="monospace">{getTextName(subtitle.surah)}:{subtitle.verse}</span>
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
					<span class="text-[#8cbb8a] font-bold"
						>{getEditionFromName(translation)?.language || translation}:</span
					>
					{subtitle.translations[translation] ?? (subtitle.surah >= 1 ? 'Downloading...' : '')}
				</p>
			{/each}
		{:else}
			<i class="text-xs text-justify text-[#c5d4c4]">Silence</i>
		{/if}
	</div>
</div>

{#if leftClicked}
	<IndividualSubtitleSettings {subtitle} />
{/if}

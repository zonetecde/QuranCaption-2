<script lang="ts">
	import { milisecondsToMMSS, type SubtitleClip } from '$lib/models/Timeline';
	import {
		currentlyEditedSubtitleId,
		currentPage,
		setCurrentVideoTime
	} from '$lib/stores/LayoutStore';
	import { currentProject } from '$lib/stores/ProjectStore';
	import { getEditionFromName } from '$lib/stores/QuranStore';
	import { cursorPosition, scrollToCursor } from '$lib/stores/TimelineStore';
	import { isPreviewPlaying } from '$lib/stores/VideoPreviewStore';
	import toast from 'svelte-french-toast';
	import SubtitlePlayer from '../preview/SubtitlePlayer.svelte';

	let div: HTMLDivElement;

	$: if ($currentProject.timeline.subtitlesTracks[0].clips && div) {
		// Scroll to the bottom of the div
		div.scrollTop = div.scrollHeight;
	}

	async function handleSubtitleListItemTimingClicked(subtitleStart: number) {
		if ($isPreviewPlaying)
			// move the cursor to the start of the clip
			setCurrentVideoTime.set(subtitleStart / 1000);
		else {
			cursorPosition.set(subtitleStart + 1);
		}

		scrollToCursor();
	}

	function handleSubtitleListItemClicked(subtitleId: string, e: MouseEvent) {
		// check that we are not cliking on the timing button
		if (
			(e.target as HTMLElement).tagName === 'SMALL' ||
			(e.target as HTMLElement).tagName === 'BUTTON'
		) {
			return;
		}

		if ($currentPage === 'Subtitles editor') {
			if ($currentlyEditedSubtitleId === subtitleId) currentlyEditedSubtitleId.set(undefined);
			else currentlyEditedSubtitleId.set(subtitleId);
		}
	}
</script>

<div class="h-full w-full bg-[#1f1f1f] overflow-y-scroll" bind:this={div}>
	{#each $currentProject.timeline.subtitlesTracks[0].clips as subtitle}
		<!-- svelte-ignore a11y-click-events-have-key-events -->
		<!-- svelte-ignore a11y-no-static-element-interactions -->
		<div
			class={'p-2 border-b-2 border-[#413f3f] relative ' +
				(subtitle.id === $currentlyEditedSubtitleId ? 'bg-[#655429]' : 'bg-[#1f1f1f]')}
			on:click={(e) => handleSubtitleListItemClicked(subtitle.id, e)}
		>
			{#if $currentPage === 'Subtitles editor'}
				<div class="absolute top-2 right-2">
					<SubtitlePlayer {subtitle} />
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
							<span class="text-[#8cbb8a] font-bold"
								>{getEditionFromName(translation)?.language}:</span
							>
							{subtitle.translations[translation] ?? 'Downloading...'}
						</p>
					{/each}
				{:else}
					<i class="text-xs text-justify text-[#c5d4c4]">Silence</i>
				{/if}
			</div>
		</div>
	{/each}
</div>

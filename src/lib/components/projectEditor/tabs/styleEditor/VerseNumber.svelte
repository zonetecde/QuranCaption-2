<script lang="ts">
	import { Quran } from '$lib/classes/Quran';
	import { globalState } from '$lib/runes/main.svelte';
	import { onMount, untrack } from 'svelte';
	import { verticalDrag } from '$lib/services/verticalDrag';
	import { draw, fade } from 'svelte/transition';
	import CompositeText from './CompositeText.svelte';
	import RecitersManager from '$lib/classes/Reciter';
	import { VerseRange } from '$lib/classes';

	let {
		currentSurah,
		currentVerse
	}: {
		currentSurah: number;
		currentVerse: number;
	} = $props();

	let verseNumberSettings = $derived(() => {
		return {
			show: globalState.getStyle('global', 'show-verse-number')!.value,

			verticalPosition: globalState.getStyle('global', 'verse-number-vertical-position')!
				.value as number,
			horizontalPosition: globalState.getStyle('global', 'verse-number-horizontal-position')!
				.value as number,

			verseNumberFormat: globalState.getStyle('global', 'verse-number-format')!.value as string
		};
	});
</script>

{#if verseNumberSettings().show && currentSurah > 0 && currentVerse > 0}
	<div
		ondblclick={() => {
			globalState.getVideoStyle.highlightCategory('global', 'verse-number');
		}}
		use:verticalDrag={{
			target: 'global',
			styleId: 'verse-number-vertical-position'
		}}
		class="w-[100px] absolute flex flex-col items-center cursor-move select-none"
		style={`transform: translateY(${verseNumberSettings().verticalPosition}px) translateX(${verseNumberSettings().horizontalPosition}px);`}
	>
		<div class="w-[700px] text-center">
			<CompositeText compositeStyle={globalState.getStyle('global', 'verse-number-text-style')!}>
				{verseNumberSettings()
					.verseNumberFormat.replace('<surah>', currentSurah.toString())
					.replace('<verse>', currentVerse.toString())
					.replace(
						'<min-range>',
						VerseRange.getExportVerseRange().getRangeForSurah(currentSurah).verseStart.toString()
					)
					.replace(
						'<max-range>',
						VerseRange.getExportVerseRange().getRangeForSurah(currentSurah).verseEnd.toString()
					)}
			</CompositeText>
		</div>
	</div>
{/if}

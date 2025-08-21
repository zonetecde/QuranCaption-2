<script lang="ts">
	import { Quran } from '$lib/classes/Quran';
	import { globalState } from '$lib/runes/main.svelte';
	import { onMount, untrack } from 'svelte';
	import { verticalDrag } from '$lib/services/verticalDrag';
	import { draw, fade } from 'svelte/transition';
	import CompositeText from './CompositeText.svelte';
	import RecitersManager from '$lib/classes/Reciter';

	let {
		currentSurah,
		currentVerse
	}: {
		currentSurah: number;
		currentVerse: number;
	} = $props();

	let verseNumberSettings = $derived(() => {
		return {
			show: globalState.getVideoStyle.getStylesOfTarget('global').findStyle('show-verse-number')!
				.value,

			verticalPosition: globalState.getVideoStyle
				.getStylesOfTarget('global')
				.findStyle('verse-number-vertical-position')!.value as number,
			horizontalPosition: globalState.getVideoStyle
				.getStylesOfTarget('global')
				.findStyle('verse-number-horizontal-position')!.value as number,

			verseNumberFormat: globalState.getVideoStyle
				.getStylesOfTarget('global')
				.findStyle('verse-number-format')!.value as string
		};
	});
</script>

{#if verseNumberSettings().show && currentSurah > 0 && currentVerse > 0}
	<div
		use:verticalDrag={{
			getInitial: () => Number(verseNumberSettings().verticalPosition),
			apply: (v: number) =>
				globalState.getVideoStyle
					.getStylesOfTarget('global')
					.setStyle('verse-number-vertical-position', v),
			min: globalState.getVideoStyle
				.getStylesOfTarget('global')
				.findStyle('verse-number-vertical-position')!.valueMin,
			max: globalState.getVideoStyle
				.getStylesOfTarget('global')
				.findStyle('verse-number-vertical-position')!.valueMax
		}}
		class="w-[100px] absolute flex flex-col items-center cursor-move select-none"
		style={`transform: translateY(${verseNumberSettings().verticalPosition}px) translateX(${verseNumberSettings().horizontalPosition}px);`}
	>
		<div class="w-[700px] text-center">
			<CompositeText
				compositeStyle={globalState.getVideoStyle
					.getStylesOfTarget('global')
					.findStyle('verse-number-text-style')!}
			>
				{verseNumberSettings()
					.verseNumberFormat.replace('<surah>', currentSurah.toString())
					.replace('<verse>', currentVerse.toString())}
			</CompositeText>
		</div>
	</div>
{/if}

<script lang="ts">
	import { Quran } from '$lib/classes/Quran';
	import { globalState } from '$lib/runes/main.svelte';
	import { onMount, untrack } from 'svelte';
	import { verticalDrag } from '$lib/services/verticalDrag';
	import { draw, fade } from 'svelte/transition';
	import CompositeText from './CompositeText.svelte';

	const currentSurah = $derived(() => {
		return globalState.getSubtitleTrack.getCurrentSurah();
	});

	let surahNameSettings = $derived(() => {
		return {
			show: globalState.getStyle('global', 'show-surah-name')!.value,
			size: globalState.getStyle('global', 'surah-size')!.value,
			showArabic: globalState.getStyle('global', 'surah-show-arabic')!.value,
			showLatin: globalState.getStyle('global', 'surah-show-latin')!.value,
			surahLatinSpacing: globalState.getStyle('global', 'surah-latin-spacing')!.value as number,
			surahNameFormat: globalState.getStyle('global', 'surah-name-format')!.value as string,
			verticalPosition: globalState.getStyle('global', 'surah-name-vertical-position')!
				.value as number,
			horizontalPosition: globalState.getStyle('global', 'surah-name-horizontal-position')!
				.value as number,
			opacity: globalState.getStyle('global', 'surah-opacity')!.value,
			color: globalState
				.getStyle('global', 'surah-latin-text-style')!
				.getCompositeStyle('text-color')!.value,
			outlineWidth: globalState
				.getStyle('global', 'surah-latin-text-style')!
				.getCompositeStyle('text-outline')!.value,
			outlineColor: globalState
				.getStyle('global', 'surah-latin-text-style')!
				.getCompositeStyle('text-outline-color')!.value,
			enableOutline: globalState
				.getStyle('global', 'surah-latin-text-style')!
				.getCompositeStyle('outline-enable')!.value,
			glowEnable: globalState
				.getStyle('global', 'surah-latin-text-style')!
				.getCompositeStyle('text-glow-enable')!.value,
			glowColor: globalState
				.getStyle('global', 'surah-latin-text-style')!
				.getCompositeStyle('text-glow-color')!.value,
			glowBlur: globalState
				.getStyle('global', 'surah-latin-text-style')!
				.getCompositeStyle('text-glow-blur')!.value
		};
	});
</script>

{#if surahNameSettings().show && currentSurah() >= 1 && currentSurah() <= 114}
	<div
		ondblclick={() => {
			globalState.getVideoStyle.highlightCategory('global', 'surah-name');
		}}
		use:verticalDrag={{
			target: 'global',
			styleId: 'surah-name-vertical-position'
		}}
		class="w-[100px] absolute flex flex-col items-center cursor-move select-none"
		style={`transform: translateY(${surahNameSettings().verticalPosition}px) translateX(${surahNameSettings().horizontalPosition}px); opacity: ${surahNameSettings().opacity}; `}
	>
		<p
			class="surahs-font"
			style={`opacity: ${surahNameSettings().showArabic ? 1 : 0} !important; font-size: ${surahNameSettings().size}rem !important; ${globalState.getStyle('global', 'surah-latin-text-style')!.generateCSSForComposite()}; font-family: 'Surahs' !important;`}
		>
			{currentSurah().toString().padStart(3, '0')}
		</p>
		<div
			class="w-[700px] text-center"
			style={`margin-top: ${-surahNameSettings().surahLatinSpacing}rem; opacity: ${surahNameSettings().showLatin ? 1 : 0};`}
		>
			<CompositeText compositeStyle={globalState.getStyle('global', 'surah-latin-text-style')!}>
				{surahNameSettings()
					.surahNameFormat.replace('<number>', currentSurah().toString())
					.replace('<transliteration>', Quran.surahs[currentSurah() - 1].name)
					.replace('<translation>', Quran.surahs[currentSurah() - 1].translation)}
			</CompositeText>
		</div>
	</div>
{/if}

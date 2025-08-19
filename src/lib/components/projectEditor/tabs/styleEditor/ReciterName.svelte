<script lang="ts">
	import { Quran } from '$lib/classes/Quran';
	import { globalState } from '$lib/runes/main.svelte';
	import { onMount, untrack } from 'svelte';
	import { verticalDrag } from '$lib/services/verticalDrag';
	import { draw, fade } from 'svelte/transition';
	import CompositeText from './CompositeText.svelte';
	import RecitersManager from '$lib/classes/Reciter';

	const reciter = $derived(() => {
		return RecitersManager.getReciterObject(globalState.currentProject!.detail.reciter);
	});

	let reciterNameSettings = $derived(() => {
		return {
			show: globalState.getVideoStyle.getStylesOfTarget('global').findStyle('show-reciter-name')!
				.value,
			size: globalState.getVideoStyle.getStylesOfTarget('global').findStyle('reciter-size')!
				.value as number,
			showArabic: globalState.getVideoStyle
				.getStylesOfTarget('global')
				.findStyle('reciter-show-arabic')!.value,
			showLatin: globalState.getVideoStyle
				.getStylesOfTarget('global')
				.findStyle('reciter-show-latin')!.value,
			reciterLatinSpacing: globalState.getVideoStyle
				.getStylesOfTarget('global')
				.findStyle('reciter-latin-spacing')!.value,

			reciterNameFormat: globalState.getVideoStyle
				.getStylesOfTarget('global')
				.findStyle('reciter-name-format')!.value as string,
			verticalPosition: globalState.getVideoStyle
				.getStylesOfTarget('global')
				.findStyle('reciter-name-vertical-position')!.value as number,
			horizontalPosition: globalState.getVideoStyle
				.getStylesOfTarget('global')
				.findStyle('reciter-name-horizontal-position')!.value as number,
			opacity: globalState.getVideoStyle.getStylesOfTarget('global').findStyle('reciter-opacity')!
				.value,
			color: globalState.getVideoStyle
				.getStylesOfTarget('global')
				.findStyle('reciter-latin-text-style')
				?.getCompositeStyle('text-color')!.value,
			outlineWidth: globalState.getVideoStyle
				.getStylesOfTarget('global')
				.findStyle('reciter-latin-text-style')
				?.getCompositeStyle('text-outline')!.value,
			outlineColor: globalState.getVideoStyle
				.getStylesOfTarget('global')
				.findStyle('reciter-latin-text-style')
				?.getCompositeStyle('text-outline-color')!.value,
			enableOutline: globalState.getVideoStyle
				.getStylesOfTarget('global')
				.findStyle('reciter-latin-text-style')
				?.getCompositeStyle('outline-enable')!.value
		};
	});
</script>

{#if reciterNameSettings().show}
	<div
		use:verticalDrag={{
			getInitial: () => Number(reciterNameSettings().verticalPosition),
			apply: (v: number) =>
				globalState.getVideoStyle
					.getStylesOfTarget('global')
					.setStyle('reciter-name-vertical-position', v),
			min: globalState.getVideoStyle
				.getStylesOfTarget('global')
				.findStyle('reciter-name-vertical-position')!.valueMin,
			max: globalState.getVideoStyle
				.getStylesOfTarget('global')
				.findStyle('reciter-name-vertical-position')!.valueMax
		}}
		class="w-[100px] absolute flex flex-col items-center cursor-move select-none"
		style={`transform: translateY(${reciterNameSettings().verticalPosition}px) translateX(${reciterNameSettings().horizontalPosition}px); opacity: ${reciterNameSettings().opacity};`}
	>
		{#if reciter().number !== -1}
			<p
				class="reciters-font"
				style={`opacity: ${reciterNameSettings().showArabic && reciter().number !== -1 ? 1 : 0}; font-size: ${reciterNameSettings().size}rem;`}
			>
				{reciter().number}
			</p>
		{:else}
			<p
				class="arabic w-[300px] text-center h-[155px] pt-7"
				style={`opacity: ${reciterNameSettings().showArabic ? 1 : 0}; font-size: ${reciterNameSettings().size / 2}rem;`}
			>
				{reciter().arabic}
			</p>
		{/if}

		<div
			class="w-[700px] text-center"
			style={`margin-top: ${-reciterNameSettings().reciterLatinSpacing}rem; opacity: ${reciterNameSettings().showLatin ? 1 : 0};`}
		>
			<CompositeText
				compositeStyle={globalState.getVideoStyle
					.getStylesOfTarget('global')
					.findStyle('reciter-latin-text-style')!}
			>
				{reciterNameSettings()
					.reciterNameFormat.replace('<number>', reciter().toString())
					.replace('<transliteration>', reciter().latin)
					.replace('<arabic>', reciter().arabic)}
			</CompositeText>
		</div>
	</div>
{/if}

<script lang="ts">
	import { Quran } from '$lib/classes/Quran';
	import { globalState } from '$lib/runes/main.svelte';
	import { onMount, untrack } from 'svelte';
	import { verticalDrag } from '$lib/services/verticalDrag';
	import { draw, fade } from 'svelte/transition';
	import CompositeText from './CompositeText.svelte';

	let svgContainer: HTMLDivElement | null = $state(null);

	const currentSurah = $derived(() => {
		return globalState.getSubtitleTrack.getCurrentSurah();
	});

	let surahNameSettings = $derived(() => {
		return {
			show: globalState.getVideoStyle.getStylesOfTarget('global').findStyle('show-surah-name')!
				.value,
			size: globalState.getVideoStyle.getStylesOfTarget('global').findStyle('surah-size')!.value,
			showArabic: globalState.getVideoStyle
				.getStylesOfTarget('global')
				.findStyle('surah-show-arabic')!.value,
			showLatin: globalState.getVideoStyle
				.getStylesOfTarget('global')
				.findStyle('surah-show-latin')!.value,
			surahLatinSpacing: globalState.getVideoStyle
				.getStylesOfTarget('global')
				.findStyle('surah-latin-spacing')!.value,

			surahNameFormat: globalState.getVideoStyle
				.getStylesOfTarget('global')
				.findStyle('surah-name-format')!.value as string,
			verticalPosition: globalState.getVideoStyle
				.getStylesOfTarget('global')
				.findStyle('surah-name-vertical-position')!.value as number,
			horizontalPosition: globalState.getVideoStyle
				.getStylesOfTarget('global')
				.findStyle('surah-name-horizontal-position')!.value as number,
			opacity: globalState.getVideoStyle.getStylesOfTarget('global').findStyle('surah-opacity')!
				.value,
			color: globalState.getVideoStyle
				.getStylesOfTarget('global')
				.findStyle('surah-latin-text-style')
				?.getCompositeStyle('text-color')!.value,
			outlineWidth: globalState.getVideoStyle
				.getStylesOfTarget('global')
				.findStyle('surah-latin-text-style')
				?.getCompositeStyle('text-outline')!.value,
			outlineColor: globalState.getVideoStyle
				.getStylesOfTarget('global')
				.findStyle('surah-latin-text-style')
				?.getCompositeStyle('text-outline-color')!.value,
			enableOutline: globalState.getVideoStyle
				.getStylesOfTarget('global')
				.findStyle('surah-latin-text-style')
				?.getCompositeStyle('outline-enable')!.value
		};
	});

	$effect(() => {
		surahNameSettings().color;
		const currentSurahValue = currentSurah();

		untrack(async () => {
			if (currentSurahValue < 1 || currentSurahValue > 114) return;

			let url = `./surah-imgs/${currentSurahValue}.svg`;

			try {
				const res = await fetch(url);
				if (!res.ok) return;
				const svgText = await res.text();
				if (!svgContainer) return;

				try {
					const parser = new DOMParser();
					const doc = parser.parseFromString(svgText, 'image/svg+xml');
					const svgEl = doc.querySelector('svg');
					if (!svgEl) {
						svgContainer.innerHTML = svgText; // fallback
						return;
					}

					// Ensure scalable sizing
					svgEl.setAttribute('width', '100%');
					svgEl.setAttribute('height', '100%');

					// Read outline settings
					const settings = surahNameSettings();
					const enableOutline = !!settings.enableOutline;
					const outlineWidth = Number(settings.outlineWidth) * 2.5 || 0;
					const outlineColor = (settings.outlineColor as string) || '#000000';
					const mainColor = (settings.color as string) || '#000000';

					// Apply fill color to main shapes (override fills unless explicitly 'none')
					(
						svgEl.querySelectorAll('path, circle, rect, polygon, polyline, ellipse, g, text') || []
					).forEach((el) => {
						try {
							// If element explicitly sets fill="none", keep it. Otherwise set fill to main color.
							const currentFill = (el as Element).getAttribute('fill');
							if (currentFill === 'none') {
								// keep none
							} else {
								(el as Element).setAttribute('fill', mainColor);
							}

							// Apply outline if enabled
							if (enableOutline && outlineWidth > 0) {
								(el as Element).setAttribute('stroke', outlineColor);
								(el as Element).setAttribute('stroke-width', `${outlineWidth}px`);
								(el as Element).setAttribute('stroke-linejoin', 'round');
								(el as Element).setAttribute('stroke-linecap', 'round');
								// Keep stroke consistent when scaling
								(el as Element).setAttribute('vector-effect', 'non-scaling-stroke');
								// Ensure stroke is painted beneath fill where supported
								(el as Element).setAttribute('paint-order', 'stroke fill markers');
							} else {
								// remove stroke attributes if present
								try {
									(el as Element).removeAttribute('stroke-width');
								} catch (e) {}
							}
						} catch (e) {}
					});

					// Serialize back and inject
					const serializer = new XMLSerializer();
					const out = serializer.serializeToString(svgEl);
					svgContainer.innerHTML = out;
				} catch (e) {
					// fallback: inject raw SVG
					svgContainer.innerHTML = svgText;
				}
			} catch (e) {}
		});
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
		style={`transform: translateY(${surahNameSettings().verticalPosition}px) translateX(${surahNameSettings().horizontalPosition}px); opacity: ${surahNameSettings().opacity};`}
	>
		<div
			bind:this={svgContainer}
			style={`opacity: ${surahNameSettings().showArabic ? 1 : 0}; transform: scale(${surahNameSettings().size})`}
		></div>
		<div
			class="w-[700px] text-center"
			style={`margin-top: ${-surahNameSettings().surahLatinSpacing}rem; opacity: ${surahNameSettings().showLatin ? 1 : 0};`}
		>
			<CompositeText
				compositeStyle={globalState.getVideoStyle
					.getStylesOfTarget('global')
					.findStyle('surah-latin-text-style')!}
			>
				{surahNameSettings()
					.surahNameFormat.replace('<number>', currentSurah().toString())
					.replace('<transliteration>', Quran.surahs[currentSurah() - 1].name)
					.replace('<translation>', Quran.surahs[currentSurah() - 1].translation)}
			</CompositeText>
		</div>
	</div>
{/if}

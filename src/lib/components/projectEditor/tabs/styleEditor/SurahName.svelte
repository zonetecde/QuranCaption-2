<script lang="ts">
	import { Quran } from '$lib/classes/Quran';
	import { globalState } from '$lib/runes/main.svelte';
	import { onMount, untrack } from 'svelte';
	import { draw, fade } from 'svelte/transition';
	import CustomText from './CustomText.svelte';

	let svgContainer: HTMLDivElement | null = null;

	const currentSurah = $derived(() => {
		return globalState.getSubtitleTrack.getCurrentSurah();
	});

	let surahNameSettings = $derived(() => {
		return {
			show: globalState.getVideoStyle.getStyle('global', 'surah-name', 'show-surah-name').value,
			size: globalState.getVideoStyle.getStyle('global', 'surah-name', 'surah-size').value,
			showArabic: globalState.getVideoStyle.getStyle('global', 'surah-name', 'show-arabic').value,
			showLatin: globalState.getVideoStyle.getStyle('global', 'surah-name', 'show-latin').value,
			surahLatinSpacing: globalState.getVideoStyle.getStyle(
				'global',
				'surah-name',
				'surah-latin-spacing'
			).value,

			surahNameFormat: globalState.getVideoStyle.getStyle(
				'global',
				'surah-name',
				'surah-name-format'
			).value as string,
			verticalPosition: globalState.getVideoStyle.getStyle(
				'global',
				'surah-name',
				'vertical-position'
			).value,
			horizontalPosition: globalState.getVideoStyle.getStyle(
				'global',
				'surah-name',
				'horizontal-position'
			).value,
			color: globalState.getVideoStyle.getStyleFromComposite('surah-latin-text-style', 'text-color')
				.value
		};
	});

	onMount(async () => {});

	$effect(() => {
		surahNameSettings().color;
		const currentSurahValue = currentSurah();

		untrack(async () => {
			let url = `https://cdn.amrayn.com/qimages-c/${currentSurahValue}.svg`;

			try {
				const res = await fetch(url);
				if (!res.ok) return;
				const svgText = await res.text();
				if (!svgContainer) return;
				svgContainer.innerHTML = svgText;

				// Ajuster le SVG injecté pour permettre le recolor
				const svgEl = svgContainer.querySelector('svg') as SVGElement | null;
				if (!svgEl) return;
				svgEl.setAttribute('width', '100%');
				svgEl.setAttribute('height', '100%');

				// Forcer fill/stroke en rouge sur les éléments graphiques
				svgEl
					.querySelectorAll('path, circle, rect, polygon, polyline, ellipse, g')
					.forEach((el) => {
						try {
							if ((el as Element).hasAttribute('fill'))
								(el as Element).setAttribute('fill', surahNameSettings().color as string);
							else (el as Element).setAttribute('fill', surahNameSettings().color as string);
							if ((el as Element).hasAttribute('stroke'))
								(el as Element).setAttribute('stroke', surahNameSettings().color as string);
						} catch (e) {}
					});
			} catch (e) {}
		});
	});
</script>

{#if surahNameSettings().show}
	<div
		class="w-[100px] flex flex-col items-center"
		style={`transform: scale(${surahNameSettings().size}) translateY(${surahNameSettings().verticalPosition}px) translateX(${surahNameSettings().horizontalPosition}px);`}
	>
		<div
			bind:this={svgContainer}
			style={`opacity: ${surahNameSettings().showArabic ? 1 : 0};`}
		></div>
		<div
			class="w-[700px] text-center"
			style={`margin-top: ${-surahNameSettings().surahLatinSpacing}rem; opacity: ${surahNameSettings().showLatin ? 1 : 0};`}
		>
			<CustomText id="surah-latin-text-style">
				{surahNameSettings()
					.surahNameFormat.replace('<number>', currentSurah().toString())
					.replace('<transliteration>', Quran.surahs[currentSurah()].name)
					.replace('<translation>', Quran.surahs[currentSurah()].translation)}
			</CustomText>
		</div>
	</div>
{/if}

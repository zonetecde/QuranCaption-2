<script lang="ts">
	import { globalState } from '$lib/runes/main.svelte';
	import { onMount, untrack } from 'svelte';
	import { draw, fade } from 'svelte/transition';

	let svgContainer: HTMLDivElement | null = null;

	const currentSurah = $derived(() => {
		return globalState.getSubtitleTrack.getCurrentSurah();
	});

	let surahNameSettings = $derived(() => {
		return {
			show: globalState.getVideoStyle.getStyle('global', 'surah-name', 'show-surah-name').value,
			preText: globalState.getVideoStyle.getStyle('global', 'surah-name', 'pre-surah-text').value,
			size: globalState.getVideoStyle.getStyle('global', 'surah-name', 'surah-size').value,
			showLatin: globalState.getVideoStyle.getStyle('global', 'surah-name', 'show-latin').value,
			showArabic: globalState.getVideoStyle.getStyle('global', 'surah-name', 'show-arabic').value,
			showTranslation: globalState.getVideoStyle.getStyle(
				'global',
				'surah-name',
				'show-translation'
			).value,
			verticalPosition: globalState.getVideoStyle.getStyleFromComposite(
				'surah-latin-text-style',
				'vertical-position'
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

<div
	class="w-[100px]"
	style={`transform: scale(${surahNameSettings().size}) translateY(${surahNameSettings().verticalPosition}px);`}
>
	<div bind:this={svgContainer}></div>
</div>

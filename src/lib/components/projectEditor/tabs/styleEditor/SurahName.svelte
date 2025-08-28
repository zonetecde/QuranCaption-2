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
					// puissance: 1 = défaut
					const puissance = 2;

					// Glow settings
					const glowEnable = !!settings.glowEnable;
					const glowBlur = Number(settings.glowBlur) || 0;
					const glowColor = (settings.glowColor as string) || '#ffffff';
					let glowFilterId: string | null = null;

					if (glowEnable && glowBlur > 0) {
						try {
							const SVG_NS = 'http://www.w3.org/2000/svg';
							glowFilterId = `qpc-glow-${Math.random().toString(36).slice(2, 9)}`;

							let defs = svgEl.querySelector('defs');
							if (!defs) {
								defs = doc.createElementNS(SVG_NS, 'defs');
								svgEl.insertBefore(defs, svgEl.firstChild);
							}

							const filter = doc.createElementNS(SVG_NS, 'filter');
							filter.setAttribute('id', glowFilterId);
							filter.setAttribute('filterUnits', 'userSpaceOnUse');

							const feGaussianBlur = doc.createElementNS(SVG_NS, 'feGaussianBlur');
							feGaussianBlur.setAttribute('in', 'SourceAlpha');
							// appliquer la puissance au stdDeviation (plus de puissance -> plus large et plus intense)
							feGaussianBlur.setAttribute('stdDeviation', `${glowBlur * puissance}`);
							feGaussianBlur.setAttribute('result', 'blur');

							const feFlood = doc.createElementNS(SVG_NS, 'feFlood');
							feFlood.setAttribute('flood-color', glowColor);
							feFlood.setAttribute('result', 'color');

							const feComposite = doc.createElementNS(SVG_NS, 'feComposite');
							feComposite.setAttribute('in', 'color');
							feComposite.setAttribute('in2', 'blur');
							feComposite.setAttribute('operator', 'in');
							feComposite.setAttribute('result', 'coloredBlur');

							const feMerge = doc.createElementNS(SVG_NS, 'feMerge');
							const m1 = doc.createElementNS(SVG_NS, 'feMergeNode');
							m1.setAttribute('in', 'coloredBlur');
							const m2 = doc.createElementNS(SVG_NS, 'feMergeNode');
							m2.setAttribute('in', 'SourceGraphic');
							feMerge.appendChild(m1);
							feMerge.appendChild(m2);

							filter.appendChild(feGaussianBlur);
							filter.appendChild(feFlood);
							filter.appendChild(feComposite);
							filter.appendChild(feMerge);
							defs.appendChild(filter);
						} catch (e) {
							// if building the filter fails, continue without glow
							glowFilterId = null;
						}
					}

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

							// Apply glow filter if created, otherwise remove any existing filter attribute
							if (glowFilterId) {
								try {
									(el as Element).setAttribute('filter', `url(#${glowFilterId})`);
								} catch (e) {}
							} else {
								try {
									(el as Element).removeAttribute('filter');
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
		style={`transform: translateY(${surahNameSettings().verticalPosition}px) translateX(${surahNameSettings().horizontalPosition}px); opacity: ${surahNameSettings().opacity}; `}
	>
		<div
			bind:this={svgContainer}
			style={`opacity: ${surahNameSettings().showArabic ? 1 : 0}; transform: scale(${surahNameSettings().size});`}
		></div>
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

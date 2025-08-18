<script lang="ts">
	import type { Category } from '$lib/classes/VideoStyle.svelte';
	import { globalState } from '$lib/runes/main.svelte';
	import CompositeText from './CompositeText.svelte';
	import { verticalDrag } from '$lib/services/verticalDrag';

	let { customText }: { customText: Category } = $props();

	let customTextSettings = $derived(() => {
		return {
			verticalPosition: globalState.getVideoStyle.getStyleFromCategory(
				customText,
				'vertical-position'
			).value,
			horizontalPosition: globalState.getVideoStyle.getStyleFromCategory(
				customText,
				'horizontal-position'
			).value,
			text: globalState.getVideoStyle.getStyleFromCategory(customText, 'text').value,
			opacity: () => {
				const alwaysShow = globalState.getVideoStyle.getStyleFromCategory(customText, 'always-show')
					.value as number;

				// Si on veut toujours qu'il soit affiché, alors on retourne une opacité de 1
				if (alwaysShow) return 1;

				// En fonction de son temps d'apparition et de la valeur du fondu
				const fadeDuration = globalState.getVideoStyle.getStyle(
					'global',
					'animation',
					'fade-duration'
				).value as number;
				const currentTime = globalState.currentProject!.projectEditorState.timeline.cursorPosition;

				const startTime = globalState.getVideoStyle.getStyleFromCategory(
					customText,
					'time-appearance'
				).value as number;
				const endTime = globalState.getVideoStyle.getStyleFromCategory(
					customText,
					'time-disappearance'
				).value as number;

				// Avant l'apparition
				if (currentTime < startTime) return 0;

				// Fondu entrant : startTime -> startTime + fadeDuration
				if (currentTime >= startTime && currentTime < startTime + fadeDuration) {
					if (fadeDuration <= 0) return 1;
					return Math.max(0, Math.min(1, (currentTime - startTime) / fadeDuration));
				}

				// Pleine opacité entre la fin du fondu entrant et le début du fondu sortant
				if (currentTime >= startTime + fadeDuration && currentTime < endTime - fadeDuration)
					return 1;

				// Fondu sortant : endTime - fadeDuration -> endTime
				if (currentTime >= endTime - fadeDuration && currentTime <= endTime) {
					if (fadeDuration <= 0) return 0;
					return Math.max(0, Math.min(1, (endTime - currentTime) / fadeDuration));
				}

				// Après la disparition
				return 0;
			}
		};
	});

	const verticalStyle = globalState.getVideoStyle.getStyleFromCategory(
		customText,
		'vertical-position'
	);
</script>

<div
	use:verticalDrag={{
		getInitial: () => Number(verticalStyle.value),
		apply: (v: number) => (verticalStyle.value = v),
		min: verticalStyle.valueMin,
		max: verticalStyle.valueMax
	}}
	class="absolute cursor-move select-none"
	style={`transform: translateY(${customTextSettings().verticalPosition}px) translateX(${customTextSettings().horizontalPosition}px); opacity: ${customTextSettings().opacity()}`}
>
	<CompositeText id={customText.getStyle('custom-text-composite')!.id}>
		{customTextSettings().text}
	</CompositeText>
</div>

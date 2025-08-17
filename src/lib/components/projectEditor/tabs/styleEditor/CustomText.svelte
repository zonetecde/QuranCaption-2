<script lang="ts">
	import type { Category } from '$lib/classes/VideoStyle.svelte';
	import { globalState } from '$lib/runes/main.svelte';
	import CompositeText from './CompositeText.svelte';

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
			text: globalState.getVideoStyle.getStyleFromCategory(customText, 'text').value
		};
	});
</script>

<div
	class="absolute"
	style={`transform: translateY(${customTextSettings().verticalPosition}px) translateX(${customTextSettings().horizontalPosition}px);`}
>
	<CompositeText id={globalState.getVideoStyle.getCompositeStyleIdFromCategory(customText)}>
		{customTextSettings().text}
	</CompositeText>
</div>

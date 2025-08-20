<script lang="ts">
	import type { Category, Style } from '$lib/classes';
	import { globalState } from '$lib/runes/main.svelte';

	let {
		compositeStyle,
		children
	}: {
		compositeStyle: Style;
		children: any;
	} = $props();

	let getCss = $derived(() => {
		return compositeStyle.generateCSSForComposite();
	});
</script>

<p style={getCss()}>
	{@render children()}
</p>

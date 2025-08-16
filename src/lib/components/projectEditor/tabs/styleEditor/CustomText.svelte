<script lang="ts">
	import { globalState } from '$lib/runes/main.svelte';

	let {
		id,
		children
	}: {
		id: string;
		children: any;
	} = $props();

	let getCss = $derived(() => {
		const toIgnore =
			id === 'surah-latin-text-style' ? ['vertical-position', 'horizontal-position'] : [];

		return globalState.getVideoStyle.generateCSSForComposite(id, toIgnore);
	});
</script>

<p style={getCss()}>
	{@render children()}
</p>

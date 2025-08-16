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
		return globalState.getVideoStyle.generateCSSForComposite(id);
	});
</script>

<p style={getCss()}>
	{@render children()}
</p>

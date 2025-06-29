<script lang="ts">
	import { onMount } from 'svelte';
	import { getCurrentWindow } from '@tauri-apps/api/window';
	import TitleBar from './TitleBar.svelte';

	onMount(async () => {
		// rend la fenetre no decoration
		(await getCurrentWindow()).setDecorations(false);
	});
</script>

<TitleBar />

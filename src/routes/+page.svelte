<script>
	import Home from '$lib/components/home/Home.svelte';
	import ProjectEditor from '$lib/components/projectEditor/ProjectEditor.svelte';
	import { globalState } from '$lib/runes/main.svelte';
	import ShortcutService from '$lib/services/ShortcutService';
	import { onMount } from 'svelte';

	onMount(() => {
		// Init le gestionnaire de shortcuts
		ShortcutService.init();
	});
</script>

{#if globalState.currentProject === null}
	<Home />
{:else}
	<ProjectEditor />
{/if}

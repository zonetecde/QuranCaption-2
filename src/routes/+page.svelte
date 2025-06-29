<script>
	import Home from '$lib/components/home/Home.svelte';
	import ProjectEditor from '$lib/components/projectEditor/ProjectEditor.svelte';
	import { globalState } from '$lib/runes/main.svelte';
</script>

{#if globalState.currentProject === null}
	<Home />
{:else}
	<ProjectEditor />
{/if}

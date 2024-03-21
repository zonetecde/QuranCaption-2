<script lang="ts">
	import type Project from '$lib/Project';
	import Header from '$lib/components/header/Header.svelte';
	import SubtitleEditor from '$lib/components/layout/SubtitleEditor.svelte';
	import VideoEditor from '$lib/components/layout/VideoEditor.svelte';
	import { currentPage } from '$lib/stores/LayoutStore';
	import { currentProject } from '$lib/stores/ProjectStore';
	import { onMount } from 'svelte';

	export let data: Project;

	onMount(() => {
		// Initialize the current project
		currentProject.set(data);
	});
</script>

<div class="h-screen flex flex-col" id="container">
	<!-- Top bar -->
	<!-- There's an issue with the top bar, it's making the main window have a scroll bar -->
	<header class="w-full min-h-14 border-b-2 border-[#413f3f]">
		<Header />
	</header>

	<div style="height: calc(100% - 3.5rem);">
		{#if $currentPage === 'Video editor'}
			<VideoEditor />
		{:else if $currentPage === 'Subtitle editor'}
			<SubtitleEditor />
		{:else if $currentPage === 'Export'}
			<!-- <Export /> -->
		{/if}
	</div>
</div>

<style>
	#container {
		--s: 140px;
		--c1: #171717;
		--c2: #191919;

		--_g: var(--c1) 0% 5%, var(--c2) 6% 15%, var(--c1) 16% 25%, var(--c2) 26% 35%, var(--c1) 36% 45%,
			var(--c2) 46% 55%, var(--c1) 56% 65%, var(--c2) 66% 75%, var(--c1) 76% 85%, var(--c2) 86% 95%,
			#0000 96%;

		background:
			radial-gradient(closest-side at 100% 0, var(--_g)),
			radial-gradient(closest-side at 0 100%, var(--_g)),
			radial-gradient(closest-side, var(--_g)),
			radial-gradient(closest-side, var(--_g)) calc(var(--s) / 2) calc(var(--s) / 2) var(--c1);

		background-size: var(--s) var(--s);
	}
</style>

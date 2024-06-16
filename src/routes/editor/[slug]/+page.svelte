<script lang="ts">
	import Header from '$lib/components/header/Header.svelte';
	import SubtitleEditor from '$lib/components/layout/SubtitleEditor.svelte';
	import TranslationsEditor from '$lib/components/layout/TranslationsEditor.svelte';
	import VideoEditor from '$lib/components/layout/VideoEditor.svelte';
	import {
		addNewTranslationPopupVisibility,
		currentPage,
		trimDialog
	} from '$lib/stores/LayoutStore';
	import { editions } from '$lib/stores/QuranStore';
</script>

<div class="h-screen flex flex-col overflow-x-hidden" id="container">
	<!-- Top bar -->
	<!-- There's an issue with the top bar, it's making the main window have a scroll bar -->
	<header class="w-full min-h-14 border-b-2 border-[#413f3f]">
		<Header />
	</header>

	<div style="height: calc(100% - 3.5rem);">
		{#if $currentPage === 'Video editor'}
			<VideoEditor />
		{:else if $currentPage === 'Subtitles editor'}
			<SubtitleEditor />
		{:else if $currentPage === 'Translations'}
			<TranslationsEditor />
		{:else if $currentPage === 'Export'}
			<!-- <Export /> -->
		{/if}
	</div>
</div>

{#if $trimDialog !== undefined}
	<div class="absolute inset-0">
		<div class="w-10/12 h-4/6"></div>
	</div>
{/if}

{#if $addNewTranslationPopupVisibility}
	<div class="absolute inset-0 z-50">
		<div class="w-full h-full flex items-center justify-center backdrop-blur-sm">
			<div
				class="w-[400px] h-[500px] rounded-2xl bg-[#1b1a1a] border-2 border-[#2e2b2b] shadow-black shadow-2xl flex flex-col items-center"
			>
				{#if $editions}
					<select
						class="w-full bg-transparent border-2 border-slate-500 p-1 rounded-lg outline-none"
					>
						{#each $editions as edition}
							<option value={edition.name} class="bg-slate-300 text-black"
								>{edition.language +
									' - ' +
									edition.author.slice(0, 30) +
									(edition.author.length > 30 ? '...' : '')}</option
							>
						{/each}
					</select>
				{/if}
			</div>
		</div>
	</div>
{/if}

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

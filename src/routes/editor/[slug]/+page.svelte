<script lang="ts">
	import type Project from '$lib/Project';
	import type { Surah } from '$lib/Quran';
	import ClipManager from '$lib/components/clipmanager/ClipManager.svelte';
	import Header from '$lib/components/header/Header.svelte';

	export let data: Project;
</script>

<div class="h-screen flex flex-col" id="container">
	<!-- Top bar -->
	<!-- There's an issue with the top bar, it's making the main window have a scroll bar -->
	<header class="w-full min-h-14 border-b-2 border-[#413f3f]">
		<Header />
	</header>

	<div class="flex-row w-full flex" style="height: calc(100% - 3.5rem);">
		<!-- Quran and clip explorer -->
		<section class="w-[25%] min-w-[220px]">
			<ClipManager />
		</section>

		<section class="flex-grow flex flex-row divide-x-4 divide-[#413f3f]">
			<!-- Editor -->
			<section class="w-[70%] divide-y-4 divide-[#413f3f]">
				<!-- Words selector -->
				<section class="h-[75%]"></section>

				<!-- Timeline -->
				<section class="h-[25%]"></section>
			</section>

			<!-- Video preview & subtitles -->
			<section class="flex-grow flex" id="preview"></section>
		</section>
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

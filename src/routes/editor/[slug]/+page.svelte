<script lang="ts">
	import type Project from '$lib/Project';

	export let data: Project;
</script>

<div class="w-screen h-screen flex flex-row divide-x-4 divide-[#413f3f]" id="container">
	<section class="w-[15%] min-w-[220px] relative"></section>
	<section class="flex-grow flex flex-row divide-x-4 divide-[#413f3f]">
		<!-- Editor -->
		<section class="w-[70%]"></section>

		<!-- Video preview & subtitles -->
		<section class="flex-grow flex" id="preview"></section>
	</section>
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

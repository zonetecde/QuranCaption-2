<script lang="ts">
	import { onMount } from 'svelte';
	import AssetsManager from '../assetsmanager/AssetsManager.svelte';
	import Timeline from '../timeline/Timeline.svelte';
</script>

<div class="flex-row w-full h-full grid grid-cols-2-template">
	<!-- Quran and clip explorer -->
	<section class="min-w-[220px]">
		<AssetsManager />
	</section>

	<section class="flex-grow flex flex-row divide-x-4 divide-[#413f3f]">
		<!-- Editor -->
		<section class="w-full divide-y-4 divide-[#413f3f]">
			<!-- Words selector -->
			<section class="h-[65%]"></section>

			<!-- Timeline -->
			<section class="h-[35%]">
				<Timeline />
			</section>
		</section>
	</section>
</div>

<style>
	/* grid cols 2 : first col 25% the second col 75% */
	.grid-cols-2-template {
		grid-template-columns: 25% 75%;

		/* make it  */
	}
</style>

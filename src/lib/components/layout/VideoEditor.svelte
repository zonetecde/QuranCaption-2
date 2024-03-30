<script lang="ts">
	import { onMount } from 'svelte';
	import AssetsManager from '../assetsmanager/AssetsManager.svelte';
	import Timeline from '../timeline/Timeline.svelte';
</script>

<div class="flex-row flex w-full h-full">
	<!-- Quran and clip explorer -->
	<section class="w-[25%] min-w-[220px]">
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

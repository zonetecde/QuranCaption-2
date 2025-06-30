<script>
	import Timeline from '../../timeline/Timeline.svelte';
	import VideoPreview from '../../videoPreview/VideoPreview.svelte';
</script>

<div class="flex-grow w-screen grid grid-cols-2-template">
	<!-- Quran and clip explorer -->
	<section
		class="min-w-[220px] divide-y-2 divide-color max-h-full overflow-hidden flex flex-col border-r-2 border-color border-t-2"
	>
		<!-- <AssetsManager /> -->
	</section>
	<section class="flex-grow flex flex-row divide-x-2 divide-color">
		<!-- Editor -->
		<section class="w-full divide-y-2 divide-color flex flex-col">
			<!-- Video preview -->
			<section class="flex-grow">
				<VideoPreview />
			</section>

			<!-- Timeline -->
			<section class="overflow-hidden">
				<Timeline />
			</section>
		</section>
	</section>
</div>

<style>
	/* grid cols 2 : first col 25% the second col 75% */
	.grid-cols-2-template {
		grid-template-columns: 25% 75%;
	}
</style>

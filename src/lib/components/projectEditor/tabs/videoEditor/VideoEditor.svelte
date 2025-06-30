<script>
	import Timeline from '../../timeline/Timeline.svelte';
	import VideoPreview from '../../videoPreview/VideoPreview.svelte';
	import AssetsManager from './assetsManager/AssetsManager.svelte';
</script>

<div class="flex-grow w-screen flex">
	<!-- Assets -->
	<section
		class="w-[18%] min-w-[220px] divide-y-2 divide-color max-h-full overflow-hidden flex flex-col border-r-2 border-color border-t-2"
	>
		<AssetsManager />
	</section>
	<section class="flex-grow flex flex-row">
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
	<!-- Settings -->
	<section
		class="w-[18%] min-w-[220px] divide-y-2 divide-color max-h-full overflow-hidden flex flex-col border-l-2 border-color border-t-2"
	>
		<!-- <AssetsManager /> -->
	</section>
</div>

<style>
	/* Styles personnalisés si nécessaire */
</style>

<script>
	import Timeline from '../../timeline/Timeline.svelte';
	import VideoPreview from '../../videoPreview/VideoPreview.svelte';
	import AssetsManager from './assetsManager/AssetsManager.svelte';
</script>

<div class="flex-grow w-full max-w-full flex overflow-hidden">
	<!-- Assets -->
	<section
		class="w-[250px] flex-shrink-0 divide-y-2 divide-color max-h-full overflow-hidden flex flex-col border-r-2 border-color border-t-2"
	>
		<AssetsManager />
	</section>
	<section class="flex-1 min-w-0 flex flex-row">
		<section class="w-full min-w-0 divide-y-2 divide-color flex flex-col">
			<!-- Video preview -->
			<section class="flex-grow">
				<VideoPreview />
			</section>

			<!-- Timeline -->
			<section class="overflow-hidden min-w-0">
				<Timeline />
			</section>
		</section>
	</section>
	<!-- Settings -->
	<section
		class="w-[250px] flex-shrink-0 divide-y-2 divide-color max-h-full overflow-hidden flex flex-col border-l-2 border-color border-t-2"
	>
		<!-- <AssetsManager /> -->
	</section>
</div>

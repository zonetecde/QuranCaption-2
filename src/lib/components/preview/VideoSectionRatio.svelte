<script lang="ts">
	import {
		bottomRatio,
		currentlyExporting,
		exportType,
		middleRatio,
		orientation,
		topRatio
	} from '$lib/stores/ExportStore';
	import { currentPage, videoDimensions } from '$lib/stores/LayoutStore';
	import { currentProject } from '$lib/stores/ProjectStore';

	export let hideControls;

	let totalHeight = 0;
	let widthForPortrait = 0;
	let maindiv: HTMLDivElement;

	$: if ($videoDimensions && maindiv) {
		totalHeight = maindiv.clientHeight;

		// for a 9/16 ratio, calculate the width
		widthForPortrait = (totalHeight * 9) / 16;
	}
</script>

<!-- Video Section Ratio Visualization (vertical) -->
{#if $currentlyExporting === false && $currentPage === 'Export' && $exportType === 'video-static'}
	<!-- Horizontal separator lines - adjusted to not overlap with control bar -->
	<div bind:this={maindiv} class="absolute inset-0 pointer-events-none">
		<div
			class="absolute w-full h-0.5 bg-white bg-opacity-30 pointer-events-none z-10"
			style="top: {$topRatio}%;"
		></div>
		<!-- Line between middle and bottom sections -->
		<div
			class="absolute w-full h-0.5 bg-white bg-opacity-30 pointer-events-none z-10"
			style="top: {$topRatio + $middleRatio}%;"
		></div>
	</div>
	<!-- Section visualization adjusted to not overlap with control bar -->
	<div
		class="absolute right-2 top-0 flex flex-col z-20"
		class:bottom-0={hideControls}
		class:h-[calc(100%)]={!hideControls}
		class:h-full={hideControls}
		style="width: 40px;"
	>
		<!-- Section indicators with labels -->
		<div class="relative h-full flex flex-col">
			<!-- Top Section -->
			<div
				class="relative bg-indigo-600 bg-opacity-40 border border-white border-opacity-30 flex items-center justify-center"
				style="height: {$topRatio}%;"
			>
				<span class="text-white text-xs font-bold transform -rotate-90 shadow-sm">TOP</span>
			</div>

			<!-- Middle Section -->
			<div
				class="relative bg-green-600 bg-opacity-40 border border-white border-opacity-30 flex items-center justify-center"
				style="height: {$middleRatio}%;"
			>
				<span class="text-white text-xs font-bold transform -rotate-90 shadow-sm">MIDDLE</span>
			</div>

			<!-- Bottom Section -->
			<div
				class="relative bg-amber-600 bg-opacity-40 border border-white border-opacity-30 flex items-center justify-center"
				style="height: {$bottomRatio}%;"
			>
				<span class="text-white text-xs font-bold transform -rotate-90 shadow-sm">BOTTOM</span>
			</div>
		</div>
	</div>
{/if}

{#if ($currentlyExporting === false && ($currentPage === 'Export' || $currentPage === 'Video editor') && $exportType === 'video-static' && $orientation === 'portrait') || $currentProject.projectSettings.isPortrait}
	<!-- Video Section Ratio Visualization (horizontal) -->
	<div
		bind:this={maindiv}
		class="absolute inset-0 pointer-events-none -mb-24"
		class:bottom-16={!hideControls}
		class:bottom-0={hideControls}
	>
		<!-- Visualisation du ratio 9:16 (bordures gauche et droite) -->
		{#if widthForPortrait > 0}
			<div
				class="absolute top-0 bottom-0 bg-black bg-opacity-80 border-r border-white border-opacity-75 z-10"
				style="left: 0; width: calc(50% - {widthForPortrait / 2}px);"
			></div>
			<div
				class="absolute top-0 bottom-0 bg-black bg-opacity-80 border-l border-white border-opacity-75 z-10"
				style="right: 0; width: calc(50% - {widthForPortrait / 2}px);"
			></div>
		{/if}
	</div>
{/if}

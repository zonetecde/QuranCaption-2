<script lang="ts">
	import { exportCurrentProjectAsVideo } from '$lib/functions/ExportProject';
	import { endTime, startTime, topRatio, middleRatio, bottomRatio } from '$lib/stores/ExportStore';

	import { getVideoDurationInMs } from '$lib/stores/TimelineStore';
	import { getCurrentCursorTime } from '$lib/stores/VideoPreviewStore';
	import { onMount } from 'svelte';

	function millisecondsToTime(ms: number): string {
		const milliseconds = Math.round((ms % 1000) / 10);
		const seconds = Math.floor(ms / 1000);
		const minutes = Math.floor(seconds / 60);
		const hours = Math.floor(minutes / 60);

		const formattedHours = hours.toString().padStart(2, '0');
		const formattedMinutes = (minutes % 60).toString().padStart(2, '0');
		const formattedSeconds = (seconds % 60).toString().padStart(2, '0');
		const formattedMilliseconds = milliseconds.toString().padStart(2, '0');

		return `${formattedHours}:${formattedMinutes}:${formattedSeconds}:${formattedMilliseconds}`;
	}

	async function handleSetCurrentTime(inputId: string) {
		switch (inputId) {
			case 'start-time':
				startTime.set(getCurrentCursorTime());
				break;
			case 'end-time':
				endTime.set(getCurrentCursorTime());
				break;
		}
	}
</script>

<!-- start time input -->
<div class="flex flex-col gap-2">
	<label for="start-time" class="text-sm font-bold">Start time (HH:MM:SS:cc)</label>
	<div class="flex gap-2">
		<p id="start-time" class="flex-1 p-2 rounded-md bg-[#1c2c29] text-white">
			{millisecondsToTime($startTime)}
		</p>
		<button
			class="px-3 py-1 bg-[#2a3a37] hover:bg-[#3a4a47] rounded-md text-sm"
			on:click={() => handleSetCurrentTime('start-time')}
		>
			Set current
		</button>
	</div>
</div>

<!-- end time input -->
<div class="flex flex-col gap-2">
	<label for="end-time" class="text-sm font-bold">End time (HH:MM:SS:cc)</label>
	<div class="flex gap-2">
		<p id="end-time" class="flex-1 p-2 rounded-md bg-[#1c2c29] text-white">
			{$endTime === null
				? millisecondsToTime(getVideoDurationInMs())
				: millisecondsToTime($endTime)}
		</p>
		<button
			class="px-3 py-1 bg-[#2a3a37] hover:bg-[#3a4a47] rounded-md text-sm"
			on:click={() => handleSetCurrentTime('end-time')}
		>
			Set current
		</button>
	</div>
</div>

<!-- Video section ratios -->
<div class="mt-6 mb-4">
	<h3 class="text-lg font-bold mb-2">Video Section Ratios</h3>
	<p class="text-sm mb-4 opacity-80">
		Divide your video into three vertical sections: Top, Middle, and Bottom. The Top and Bottom
		sections will remain unaffected by the fade effect, while the Middle section is intended for
		subtitles. Ensure the ratios are accurate, especially in fullscreen mode, as maintaining proper
		alignment is more critical there than in the preview.
	</p>

	<div class="bg-[#2c2c2c] py-4 px-1 -mx-3 rounded-lg mb-4">
		<div class="grid grid-cols-3 gap-1 mb-4">
			<div class="flex-1 flex flex-col">
				<label for="top-ratio" class="xl:text-sm text-xs font-medium mb-1">Top Section (%)</label>
				<input
					id="top-ratio"
					type="number"
					min="0"
					max="100"
					class="p-2 bg-gray-700 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
					bind:value={$topRatio}
					on:change={() => {
						// Ensure total is 100%
						if ($topRatio + $middleRatio + $bottomRatio !== 100) {
							const remaining = 100 - $topRatio;
							// Distribute remaining percentage proportionally between middle and bottom
							const sum = $middleRatio + $bottomRatio;
							if (sum > 0) {
								$middleRatio = Math.round((remaining * $middleRatio) / sum);
								$bottomRatio = 100 - $topRatio - $middleRatio;
							} else {
								// Default split if both are 0
								$middleRatio = Math.round(remaining * 0.75);
								$bottomRatio = remaining - $middleRatio;
							}
						}
					}}
				/>
			</div>
			<div class="flex-1 flex flex-col">
				<label for="middle-ratio" class="xl:text-sm text-xs font-medium mb-1"
					>Middle Section (%)</label
				>
				<input
					id="middle-ratio"
					type="number"
					min="0"
					max="100"
					class="p-2 bg-gray-700 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
					bind:value={$middleRatio}
					on:change={() => {
						// Ensure total is 100%
						if ($topRatio + $middleRatio + $bottomRatio !== 100) {
							$bottomRatio = 100 - $topRatio - $middleRatio;
							if ($bottomRatio < 0) {
								$bottomRatio = 0;
								$middleRatio = 100 - $topRatio;
							}
						}
					}}
				/>
			</div>
			<div class="flex-1 flex flex-col">
				<label for="bottom-ratio" class="xl:text-sm text-xs font-medium mb-1"
					>Bottom Section (%)</label
				>
				<input
					id="bottom-ratio"
					type="number"
					min="0"
					max="100"
					class="p-2 bg-gray-700 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
					bind:value={$bottomRatio}
					on:change={() => {
						// Ensure total is 100%
						if ($topRatio + $middleRatio + $bottomRatio !== 100) {
							$middleRatio = 100 - $topRatio - $bottomRatio;
							if ($middleRatio < 0) {
								$middleRatio = 0;
								$topRatio = 100 - $bottomRatio;
							}
						}
					}}
				/>
			</div>
		</div>

		<div class="w-full h-12 flex rounded overflow-hidden">
			<div class="h-full bg-indigo-600" style="width: {$topRatio}%;">
				<div class="h-full flex items-center justify-center text-xs font-bold">
					{$topRatio}%
				</div>
			</div>
			<div class="h-full bg-green-600" style="width: {$middleRatio}%;">
				<div class="h-full flex items-center justify-center text-xs font-bold">
					{$middleRatio}%
				</div>
			</div>
			<div class="h-full bg-amber-600" style="width: {$bottomRatio}%;">
				<div class="h-full flex items-center justify-center text-xs font-bold">
					{$bottomRatio}%
				</div>
			</div>
		</div>
	</div>

	<div class="grid grid-cols-3 gap-1 items-center">
		<div class="flex flex-col xl:flex-row items-center">
			<div class="w-4 h-4 bg-indigo-600 rounded mr-2"></div>
			<span class="text-xs xl:text-sm">Surah name/Other</span>
		</div>
		<div class="flex flex-col xl:flex-row items-center">
			<div class="w-4 h-4 bg-green-600 rounded mr-2"></div>

			<span class="text-xs xl:text-sm">Subtitles Area</span>
		</div>
		<div class="flex flex-col xl:flex-row items-center">
			<div class="w-4 h-4 bg-amber-600 rounded mr-2"></div>
			<span class="text-xs xl:text-sm">Creator Info/Other</span>
		</div>
	</div>

	<p class="text-xs opacity-60 mt-3">
		Note: All three sections must add up to 100%. Adjusting one value will automatically update the
		others to maintain this total.
	</p>
</div>

<!-- export button -->

<div class="flex justify-center mt-1">
	<button
		class="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md"
		on:click={exportCurrentProjectAsVideo}
	>
		Export your video
	</button>
</div>

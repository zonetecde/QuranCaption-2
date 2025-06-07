<script lang="ts">
	import {
		createOrShowExportDetailsWindow,
		exportCurrentProjectAsVideo,
		openExportWindow
	} from '$lib/functions/ExportProject';
	import {
		endTime,
		startTime,
		topRatio,
		middleRatio,
		bottomRatio,
		orientation,
		quality,
		exportType,
		fps,
		oneVideoPerAyah
	} from '$lib/stores/ExportStore';

	import { getVideoDurationInMs } from '$lib/stores/TimelineStore';
	import { getCurrentCursorTime } from '$lib/stores/VideoPreviewStore';
	import { onDestroy, onMount } from 'svelte';
	import Slider from '../common/Slider.svelte';
	import { currentProject } from '$lib/stores/ProjectStore';
	import toast from 'svelte-french-toast';

	function millisecondsToTime(ms: number, includeMs: boolean = true): string {
		const milliseconds = Math.round((ms % 1000) / 10);
		const seconds = Math.floor(ms / 1000);
		const minutes = Math.floor(seconds / 60);
		const hours = Math.floor(minutes / 60);

		const formattedHours = hours.toString().padStart(2, '0');
		const formattedMinutes = (minutes % 60).toString().padStart(2, '0');
		const formattedSeconds = (seconds % 60).toString().padStart(2, '0');
		const formattedMilliseconds = milliseconds.toString().padStart(2, '0');

		if (!includeMs) {
			return `${formattedHours}:${formattedMinutes}:${formattedSeconds}`;
		}

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

	onMount(() => {
		window.addEventListener('keydown', onKeyDown);
	});

	function onKeyDown(event: KeyboardEvent) {
		// vérifie qu'on est pas sur un input
		if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) {
			return;
		}

		if (event.key === 'Enter') {
			handleSetCurrentTime('end-time');
		} else if (event.key === 'Backspace') {
			handleSetCurrentTime('start-time');
		}
	}

	onDestroy(() => {
		window.removeEventListener('keydown', onKeyDown);
	});

	$: console.log('fps :', $currentProject.projectSettings.exportSettings.fps);

	async function startOneVideoPerAyahExport() {
		toast(
			'Starting export for each Ayah. This may take some time depending on the number of Ayahs.'
		);

		// Fait bouger les curseurs de début et de fin pour que ça corresponde à chaque subtitlesCLip
		// puis lance pour chacune l'export
		const startTimeBackup = $startTime;
		const endTimeBackup = $endTime === null ? getVideoDurationInMs() : $endTime;

		for (let i = 0; i < $currentProject.timeline.subtitlesTracks[0].clips.length; i++) {
			const element = $currentProject.timeline.subtitlesTracks[0].clips[i];

			// Vérifie que le clip est visible complètement
			if (element.start >= startTimeBackup && element.end <= endTimeBackup) {
				if (element.surah === -1 || element.verse === -1 || element.isSilence) {
					// Ignore les clips qui ne sont pas des versets (par exemple, les silences)
					continue;
				}

				// Regarde si le(s) clip(s) suivant(s) sont du meme verset/sourate.
				// si oui, le endtime sera celui du dernier clip de ce verset/sourate
				let nextElement = $currentProject.timeline.subtitlesTracks[0].clips[i + 1];
				let actualEndTime = element.end;
				while (
					nextElement &&
					nextElement.verse === element.verse &&
					nextElement.surah === element.surah
				) {
					i++;
					actualEndTime = nextElement.end;
					nextElement = $currentProject.timeline.subtitlesTracks[0].clips[i + 1];
				}

				// Met à jour le curseur de début et de fin
				startTime.set(element.start - 100); // -100 et +100 pour effet de fondu
				endTime.set(actualEndTime + 100);

				console.log('EndTime set to:', $endTime, 'StartTime set to:', $startTime);

				// Lance l'export
				await openExportWindow();

				toast.success(
					`Exporting video for Ayah ${element.verse} (${element.start} - ${element.end})`
				);
			}
		}

		// Restaure les curseurs de début et de fin
		startTime.set(startTimeBackup);
		endTime.set(endTimeBackup);
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

<!-- total time -->
<div class="flex flex-col gap-2">
	<label for="total-time" class="text-sm font-bold">
		Total video duration: {millisecondsToTime(
			$endTime === null
				? getVideoDurationInMs() - $startTime
				: $endTime - $startTime > 0
					? $endTime - $startTime
					: 0,
			false
		)} (HH:MM:SS)
	</label>

	<p class="text-xs opacity-80">
		Only clips that are visible for more than 40% of their duration will be exported; others will
		appear as black frames. This allows you to overlap slightly with adjacent clips to create smooth
		fade-in and fade-out effects at the beginning and end of your video. Audio fade effects will
		also be applied at the start and end for seamless transitions.
	</p>
</div>

<!-- landscape/portrait -->
<div
	class={'flex  flex-col mt-4 ' +
		($currentProject.projectSettings.isPortrait ? 'opacity-50 pointer-events-none' : '')}
>
	{#if $currentProject.projectSettings.isPortrait}
		<p class="text-sm font-bold mr-2">
			Portrait mode is enabled in the global subtitles settings. Disable it to export your video in
			landscape mode.
		</p>
	{/if}
	<div class="flex items-center">
		<input
			type="checkbox"
			id="landscape-mode"
			class="mr-2"
			checked={$orientation === 'portrait' || $currentProject.projectSettings.isPortrait}
			on:change={() => {
				orientation.set($orientation === 'landscape' ? 'portrait' : 'landscape');
				console.log('Orientation changed to:', $orientation);
			}}
		/>

		<label for="landscape-mode" class="text-sm font-bold">Portrait mode (TikTok format)</label>
	</div>
</div>

<!-- export button -->

<div class="grid xl:grid-cols-2 gap-4">
	<button
		class="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md"
		on:click={() => {
			// Vérifie si le projet est exportable
			if ($endTime !== null && $startTime > $endTime) {
				toast.error('Invalid export time range');
				return;
			} else if ($endTime !== null && $startTime === $endTime) {
				toast.error('Please select a time range to export');
				return;
			}
			if ($currentProject.timeline.subtitlesTracks[0].clips.length === 0) {
				toast.error('The video is empty');
				return;
			}

			if (!$oneVideoPerAyah) openExportWindow();
			else startOneVideoPerAyahExport();
		}}
	>
		Export your video
	</button>
	<button
		class="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md"
		on:click={() => createOrShowExportDetailsWindow()}
	>
		Open export details window
	</button>
</div>

<p class="text-sm">
	I would really appreciate it if you could mention Quran Caption in your video description or
	comments section and share your video with me!
</p>

<h3 class="text-xl font-bold mt-8 border-t-2 pt-8">Advanced Settings</h3>

<!-- quality (slide bar from 1 to 3) -->
<div class="flex flex-col">
	<p class="font-bold mr-2">Quality</p>
	<p class="text-xs opacity-80 mt-1">
		Adjust the quality of the exported video. Note that higher quality settings may increase export
		times.<br />1 = 1080p and 2 = 4k.
	</p>
	<Slider title="Value" min={0.25} max={2} step={0.1} bind:bindValue={$quality} unit="x" />
</div>

<!-- fps number input -->
<div class="flex flex-col mt-4">
	<label for="fps" class="font-bold mr-2">FPS (Frames per second)</label>
	<p class="text-xs opacity-80 mt-1 mb-1">
		Adjust the FPS of the exported video. Higher FPS may result in smoother video but larger file
		sizes.
	</p>
	<input
		id="fps"
		type="number"
		min="1"
		max="120"
		class="p-2 bg-gray-700 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
		bind:value={$fps}
		on:change={() => {
			if ($fps < 1) {
				fps.set(1);
			} else if ($fps > 120) {
				fps.set(120);
			}
		}}
	/>
</div>

<!-- Checkbox: one video per ayah -->
<div class="flex items-center mt-4">
	<input type="checkbox" id="one-video-per-ayah" class="mr-2" bind:checked={$oneVideoPerAyah} />
	<label for="one-video-per-ayah" class="text-sm font-bold">One video per ayah</label>
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
			<span class="text-xs xl:text-sm">Surah name</span>
		</div>
		<div class="flex flex-col xl:flex-row items-center">
			<div class="w-4 h-4 bg-green-600 rounded mr-2"></div>

			<span class="text-xs xl:text-sm">Subtitles Area</span>
		</div>
		<div class="flex flex-col xl:flex-row items-center">
			<div class="w-4 h-4 bg-amber-600 rounded mr-2"></div>
			<span class="text-xs xl:text-sm">Creator Info</span>
		</div>
	</div>

	<p class="text-sm text-white mt-3">
		Note: Videos with animated backgrounds may take longer to export, especially when using
		high-quality settings. Ensure your computer meets the necessary requirements for smooth
		exporting. If the process seems to be taking too long, you can cancel the export and use OBS to
		record your video instead (instructions can be found
		<!-- svelte-ignore a11y-click-events-have-key-events -->
		<!-- svelte-ignore a11y-no-static-element-interactions -->
		<span
			class="text-blue-500 cursor-pointer hover:underline"
			on:click={() => {
				exportType.set('video-obs');
			}}>here</span
		>)
	</p>
</div>

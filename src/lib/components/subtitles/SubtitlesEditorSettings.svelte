<script lang="ts">
	import {
		showWordByWordTranslation,
		showWordByWordTransliteration,
		videoSpeed
	} from '$lib/stores/LayoutStore';
	import { currentProject, getProjectPercentageCaptioned } from '$lib/stores/ProjectStore';

	let percentage = 0;

	$: if ($currentProject.timeline.subtitlesTracks[0].clips) {
		percentage = getProjectPercentageCaptioned($currentProject);
	}
</script>

<div
	class="w-full h-full flex flex-col pt-3 px-3 bg-[#1f1f1f] overflow-y-scroll relative overflow-x-hidden"
>
	<h2 class="text-lg font-bold text-center">Subtitles Editor Settings</h2>

	<br />
	<label class="text-md">
		<input type="checkbox" bind:checked={$showWordByWordTranslation} />
		<span class="ml-0.5">Show words translation</span>
	</label>
	<label class="text-md mt-3">
		<input type="checkbox" bind:checked={$showWordByWordTransliteration} />
		<span class="ml-0.5">Show words transliteration</span>
	</label>
	<label class="text-md mt-3">
		<span class="block">Video speed :</span>
		<select
			class="bg-white bg-opacity-15 w-[200px] ml-auto ox-2 outline-none"
			bind:value={$videoSpeed}
		>
			<option class="bg-gray-800" value="0.5">0.5</option>
			<option class="bg-gray-800" value="0.75">0.75</option>
			<option class="bg-gray-800" value="1">1</option>
			<option class="bg-gray-800" value="1.25">1.25</option>
			<option class="bg-gray-800" value="1.5">1.5</option>
			<option class="bg-gray-800" value="1.75">1.75</option>
			<option class="bg-gray-800" value="2">2</option>
			<option class="bg-gray-800" value="3">3</option>
		</select>
	</label>

	<br />

	<p>Percentage of captioned video :</p>
	<!-- proggress bar -->
	<div class="relative w-full h-6 bg-[#3a3434] rounded-lg overflow-hidden">
		<div
			class="absolute top-0 left-0 h-full bg-[#5b5c66] rounded-lg"
			style="width: {percentage}%"
		></div>

		<div class="absolute top-0 left-0 h-full w-full flex justify-center items-center">
			<span class="text-white text-sm">{percentage}%</span>
		</div>
	</div>
</div>

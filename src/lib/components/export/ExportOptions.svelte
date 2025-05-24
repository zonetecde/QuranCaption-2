<script lang="ts">
	import { exportType } from '$lib/stores/ExportStore';
	import ExportObs from './ExportObs.svelte';
	import ExportStatic from './ExportStatic.svelte';
	import ExportSubtitles from './ExportSubtitles.svelte';
	import ExportYtbChapters from './ExportYtbChapters.svelte';
</script>

<div
	class="flex flex-col gap-4 bg-[#1a1b1a] p-4 h-full border-l-4 border-[#252725] overflow-y-auto overflow-x-hidden"
>
	<h1 class="text-2xl font-bold text-center mt-5">Export options</h1>

	<p>What do you want to export ?</p>
	<select
		class="w-full p-2 rounded-md bg-[#383737] border-gray-800 outline-none text-white"
		bind:value={$exportType}
	>
		<option value="video-static">Video</option>
		<option value="video-obs">Video (through OBS)</option>
		<option value="sub">Subtitles</option>
		<option value="ytb-chapters">Youtube chapters</option>
	</select>

	{#if $exportType === 'video-obs'}
		<ExportObs />
	{:else if $exportType === 'video-static'}
		<ExportStatic />
	{:else if $exportType === 'sub'}
		<ExportSubtitles />
	{:else if $exportType === 'ytb-chapters'}
		<ExportYtbChapters />
	{/if}
</div>

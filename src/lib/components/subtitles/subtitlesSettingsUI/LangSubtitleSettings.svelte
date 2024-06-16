<script lang="ts">
	import Toggle from '$lib/components/general/Toggle.svelte';
	import { currentProject } from '$lib/stores/ProjectStore';

	export let subtitleLanguage = 'arabic';
</script>

<Toggle
	text="Enable Subtitles"
	bind:checked={$currentProject.projectSettings.subtitlesTracksSettings[subtitleLanguage]
		.enableSubtitles}
/>

<!-- Font size -->
<label for="font-size" class="flex items-center">
	<span>Font Size :</span>
	<input
		type="range"
		min="1"
		max="140"
		step="1"
		class="ml-1 bg-transparent"
		bind:value={$currentProject.projectSettings.subtitlesTracksSettings[subtitleLanguage].fontSize}
	/>
</label>

<div class="border-2 border-slate-500 p-1 rounded-lg -mx-1">
	<h1 class="text-lg font-bold mb-2">Subtitle Outline</h1>
	<label for="background-color"
		><span>Outline Color :</span>
		<input
			type="color"
			class="ml-1 bg-transparent"
			bind:value={$currentProject.projectSettings.subtitlesTracksSettings[subtitleLanguage]
				.outlineColor}
		/>
	</label>

	<label class="flex mt-2"
		><span>Outline width :</span>
		<input
			type="range"
			min="1"
			max="40"
			step="0.5"
			class="ml-1 bg-transparent"
			bind:value={$currentProject.projectSettings.subtitlesTracksSettings[subtitleLanguage]
				.outlineWidth}
		/>
	</label>
</div>

<div class="border-2 border-slate-500 p-1 rounded-lg -mx-1">
	<h1 class="text-lg font-bold mb-2">Position</h1>
	<label class="flex mt-2 items-center flex-wrap overflow-x-auto">
		<span>Vertical Position :</span>
		<div class="flex">
			<input
				type="range"
				min="-1000"
				max="1000"
				step="1"
				class="ml-1 bg-slate-600"
				bind:value={$currentProject.projectSettings.subtitlesTracksSettings[subtitleLanguage]
					.verticalPosition}
			/>
			<input
				type="number"
				min="-1000"
				max="1000"
				step="1"
				class="ml-1 bg-transparent bg-slate-600 px-2 py-1 w-20"
				bind:value={$currentProject.projectSettings.subtitlesTracksSettings[subtitleLanguage]
					.verticalPosition}
			/>
		</div>
	</label>
	<label class="flex mt-2 items-center flex-wrap overflow-x-auto">
		<span>Horizontal Padding :</span>
		<div class="flex">
			<input
				type="range"
				min="0"
				max="600"
				step="1"
				class="ml-1 bg-transparent bg-slate-600"
				bind:value={$currentProject.projectSettings.subtitlesTracksSettings[subtitleLanguage]
					.horizontalPadding}
			/>
			<input
				type="number"
				min="0"
				max="600"
				step="1"
				class="ml-1 bg-transparent bg-slate-600 px-2 py-1 w-20"
				bind:value={$currentProject.projectSettings.subtitlesTracksSettings[subtitleLanguage]
					.horizontalPadding}
			/>
		</div>
	</label>
</div>

<br />

<style>
	/* Horizontal scrollbar thickness */
	::-webkit-scrollbar {
		width: 12px;
		height: 9px;
	}
</style>

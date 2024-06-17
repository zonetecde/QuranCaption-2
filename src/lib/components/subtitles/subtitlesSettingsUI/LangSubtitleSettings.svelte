<script lang="ts">
	import Toggle from '$lib/components/general/Toggle.svelte';
	import { showSubtitlesPadding } from '$lib/stores/LayoutStore';
	import { currentProject } from '$lib/stores/ProjectStore';
	import Slider from './Slider.svelte';

	export let subtitleLanguage = 'arabic';
</script>

<Toggle
	text="Enable Subtitles"
	bind:checked={$currentProject.projectSettings.subtitlesTracksSettings[subtitleLanguage]
		.enableSubtitles}
/>

<!-- Font size -->
<div class="-my-3">
	<Slider
		title="Font Size"
		min={1}
		max={140}
		step={1}
		bind:bindValue={$currentProject.projectSettings.subtitlesTracksSettings[subtitleLanguage]
			.fontSize}
	/>
</div>

<div class="border-2 border-slate-500 p-1 rounded-lg -mx-1 flex flex-col">
	<h1 class="text-lg font-bold mb-2">Subtitle Outline</h1>
	<Toggle
		text="Enable outline"
		bind:checked={$currentProject.projectSettings.subtitlesTracksSettings[subtitleLanguage]
			.enableOutline}
	/>
	<label for="background-color" class="mt-2"
		><span>Outline Color :</span>
		<input
			type="color"
			class="ml-1 bg-transparent"
			bind:value={$currentProject.projectSettings.subtitlesTracksSettings[subtitleLanguage]
				.outlineColor}
		/>
	</label>

	<Slider
		title="Outline Thickness"
		min={1}
		max={40}
		step={0.5}
		bind:bindValue={$currentProject.projectSettings.subtitlesTracksSettings[subtitleLanguage]
			.outlineThickness}
	/>
</div>

<div class="border-2 border-slate-500 p-1 rounded-lg -mx-1">
	<h1 class="text-lg font-bold mb-2">Position</h1>
	<Slider
		title="Vertical Position"
		min={-100}
		max={100}
		step={0.1}
		bind:bindValue={$currentProject.projectSettings.subtitlesTracksSettings[subtitleLanguage]
			.verticalPosition}
	/>

	<Slider
		on:focus={() => showSubtitlesPadding.set(true)}
		on:blur={() => showSubtitlesPadding.set(false)}
		title="Horizontal Padding"
		min={0}
		max={50}
		step={0.1}
		bind:bindValue={$currentProject.projectSettings.subtitlesTracksSettings[subtitleLanguage]
			.horizontalPadding}
	/>
</div>

<br />

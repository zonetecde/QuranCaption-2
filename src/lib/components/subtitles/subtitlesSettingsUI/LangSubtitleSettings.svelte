<script lang="ts">
	import Toggle from '$lib/components/general/Toggle.svelte';
	import { currentProject } from '$lib/stores/ProjectStore';

	export let selectedSubtitleSettings = 'arabic';
</script>

<Toggle
	text="Enable Subtitles"
	bind:checked={$currentProject.projectSettings.subtitlesTracksSettings[selectedSubtitleSettings]
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
		bind:value={$currentProject.projectSettings.subtitlesTracksSettings[selectedSubtitleSettings]
			.fontSize}
	/>
</label>

<div class="border-2 border-slate-500 p-1 rounded-lg -mx-1">
	<h1 class="text-lg font-bold mb-2">Subtitle Outline</h1>
	<label for="background-color"
		><span>Outline Color :</span>
		<input
			type="color"
			class="ml-1 bg-transparent"
			bind:value={$currentProject.projectSettings.subtitlesTracksSettings[selectedSubtitleSettings]
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
			bind:value={$currentProject.projectSettings.subtitlesTracksSettings[selectedSubtitleSettings]
				.outlineWidth}
		/>
	</label>
</div>

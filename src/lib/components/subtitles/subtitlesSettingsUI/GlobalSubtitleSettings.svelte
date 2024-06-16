<script lang="ts">
	import Toggle from '$lib/components/general/Toggle.svelte';
	import { currentProject } from '$lib/stores/ProjectStore';
	import Slider from './Slider.svelte';
</script>

<Slider
	title="Subtitles fade duration"
	unit="ms"
	min={0}
	max={1000}
	step={50}
	bind:bindValue={$currentProject.projectSettings.globalSubtitlesSettings.fadeDuration}
/>

<div class="border-2 border-slate-500 p-1 rounded-lg -mx-1">
	<h1 class="text-lg font-bold mb-2">Subtitle Background</h1>

	<Toggle
		text="Enable Background"
		bind:checked={$currentProject.projectSettings.globalSubtitlesSettings.background}
	/>

	<br />

	<label for="background-color"
		><span>Background Color :</span>
		<input
			type="color"
			class="ml-1 bg-transparent"
			bind:value={$currentProject.projectSettings.globalSubtitlesSettings.backgroundColor}
		/>
	</label>

	<Slider
		title="Background Opacity"
		min={0}
		max={1}
		step={0.01}
		bind:bindValue={$currentProject.projectSettings.globalSubtitlesSettings.backgroundOpacity}
	/>
</div>

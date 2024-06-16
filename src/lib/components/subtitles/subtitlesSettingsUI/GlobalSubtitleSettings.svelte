<script lang="ts">
	import Toggle from '$lib/components/general/Toggle.svelte';
	import { currentProject } from '$lib/stores/ProjectStore';
</script>

<label for="background-opacity" class="flex"
	><span>Subtitles fade duration :</span>
	<input
		type="range"
		min="0"
		max="1000"
		step="50"
		class="ml-1 bg-transparent"
		bind:value={$currentProject.projectSettings.globalSubtitlesSettings.fadeDuration}
	/>
</label>

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

	<label for="background-opacity" class="flex mt-2"
		><span>Background Opacity :</span>
		<input
			type="range"
			min="0"
			max="1"
			step="0.1"
			class="ml-1 bg-transparent"
			bind:value={$currentProject.projectSettings.globalSubtitlesSettings.backgroundOpacity}
		/>
	</label>
</div>

<script lang="ts">
	import { currentProject } from '$lib/stores/ProjectStore';
	import Toggle from '../general/Toggle.svelte';
</script>

<div class="w-full h-full flex flex-col pt-3 px-3 gap-y-5 bg-[#1f1f1f]">
	<!-- Tailwind switch -->
	<h2 class="text-lg font-bold text-center">Subtitle Settings</h2>

	<Toggle
		text="Enable Subtitles"
		bind:checked={$currentProject.projectSettings.subtitleSettings.enableSubtitles}
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
			bind:value={$currentProject.projectSettings.subtitleSettings.fontSize}
		/>
	</label>

	<div class="border-2 border-slate-500 p-1 rounded-lg -mx-1">
		<Toggle
			text="Enable Background"
			bind:checked={$currentProject.projectSettings.subtitleSettings.background}
		/>

		<br />
		<br />

		<label for="background-color"
			><span>Background Color :</span>
			<input
				type="color"
				class="ml-1 bg-transparent"
				bind:value={$currentProject.projectSettings.subtitleSettings.backgroundColor}
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
				bind:value={$currentProject.projectSettings.subtitleSettings.backgroundOpacity}
			/>
		</label>
	</div>
</div>

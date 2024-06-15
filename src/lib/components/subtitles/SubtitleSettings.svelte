<script lang="ts">
	import { currentProject } from '$lib/stores/ProjectStore';
	import Toggle from '../general/Toggle.svelte';
</script>

<div class="w-full h-full flex flex-col pt-3 px-3 gap-y-5 bg-[#1f1f1f] overflow-y-scroll">
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

	<label for="background-opacity" class="flex"
		><span>Subtitles fade duration :</span>
		<input
			type="range"
			min="0"
			max="1000"
			step="50"
			class="ml-1 bg-transparent"
			bind:value={$currentProject.projectSettings.subtitleSettings.fadeDuration}
		/>
	</label>

	<div class="border-2 border-slate-500 p-1 rounded-lg -mx-1">
		<h1 class="text-lg font-bold mb-2">Subtitle Background</h1>

		<Toggle
			text="Enable Background"
			bind:checked={$currentProject.projectSettings.subtitleSettings.background}
		/>

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
	<div class="border-2 border-slate-500 p-1 rounded-lg -mx-1">
		<h1 class="text-lg font-bold mb-2">Subtitle Outline</h1>
		<label for="background-color"
			><span>Outline Color :</span>
			<input
				type="color"
				class="ml-1 bg-transparent"
				bind:value={$currentProject.projectSettings.subtitleSettings.outlineColor}
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
				bind:value={$currentProject.projectSettings.subtitleSettings.outlineWidth}
			/>
		</label>
	</div>
</div>

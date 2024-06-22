<script lang="ts">
	import Slider from '$lib/components/general/Slider.svelte';
	import Toggle from '$lib/components/general/Toggle.svelte';
	import { showSubtitlesPadding, userFonts } from '$lib/stores/LayoutStore';
	import { currentProject } from '$lib/stores/ProjectStore';
</script>

<div class="flex flex-col">
	<Slider
		title="Subtitles fade duration"
		unit="ms"
		min={0}
		max={1000}
		step={50}
		bind:bindValue={$currentProject.projectSettings.globalSubtitlesSettings.fadeDuration}
	/>

	<Slider
		on:focus={() => showSubtitlesPadding.set(true)}
		on:blur={() => showSubtitlesPadding.set(false)}
		title="Horizontal global Padding"
		min={0}
		max={50}
		step={0.1}
		bind:bindValue={$currentProject.projectSettings.globalSubtitlesSettings.horizontalPadding}
	/>

	<Slider
		title="Video Scale"
		min={0.05}
		max={2}
		step={0.05}
		bind:bindValue={$currentProject.projectSettings.videoScale}
	/>
	<Slider
		title="Translate Video"
		min={-100}
		max={100}
		step={1}
		bind:bindValue={$currentProject.projectSettings.translateVideoX}
	/>
</div>

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

<div class="border-2 border-slate-500 p-1 rounded-lg -mx-1">
	<h1 class="text-lg font-bold mb-2">Creator Text</h1>

	<Toggle
		text="Enable Creator Text"
		bind:checked={$currentProject.projectSettings.globalSubtitlesSettings.creatorText.enable}
	/>

	<input
		type="text"
		class="bg-transparent border-2 border-slate-500 p-1 rounded-lg w-full text-sm"
		placeholder="QuranCaption"
		bind:value={$currentProject.projectSettings.globalSubtitlesSettings.creatorText.text}
	/>

	<!-- outline checkbox -->
	<label class="mt-2 flex items-center w-min"
		><span class="w-32">Enable outline :</span>
		<input
			type="checkbox"
			class="form-checkbox h-5 w-5 text-green-500"
			bind:checked={$currentProject.projectSettings.globalSubtitlesSettings.creatorText.outline}
		/>
	</label>

	<!-- Font family -->
	<label for="font-family" class="mt-2 flex items-center"
		><span class="w-32">Font Family :</span>
		<select
			class="w-full bg-transparent border-2 border-slate-500 p-1 rounded-lg outline-none"
			bind:value={$currentProject.projectSettings.globalSubtitlesSettings.creatorText.fontFamily}
		>
			<option class="bg-slate-300 text-black" value="Hafs">Hafs</option>

			{#each $userFonts as font}
				<option class="bg-slate-300 text-black" value={font}>{font}</option>
			{/each}
		</select>
	</label>

	<Slider
		title="Opacity"
		min={0}
		max={1}
		step={0.01}
		bind:bindValue={$currentProject.projectSettings.globalSubtitlesSettings.creatorText.opacity}
	/>

	<Slider
		title="Font Size"
		min={0}
		max={140}
		step={1}
		bind:bindValue={$currentProject.projectSettings.globalSubtitlesSettings.creatorText.fontSize}
	/>

	<label for="background-color" class="mt-2"
		><span>Color :</span>
		<input
			type="color"
			class="ml-1 bg-transparent"
			bind:value={$currentProject.projectSettings.globalSubtitlesSettings.creatorText.color}
		/>
	</label>

	<Slider
		title="Vertical Position"
		min={-100}
		max={100}
		step={1}
		bind:bindValue={$currentProject.projectSettings.globalSubtitlesSettings.creatorText
			.verticalPosition}
	/>
</div>

<script lang="ts">
	import Slider from '$lib/components/common/Slider.svelte';
	import Toggle from '$lib/components/common/Toggle.svelte';
	import { ImgFileExt } from '$lib/ext/File';
	import { milisecondsToMMSS } from '$lib/models/Timeline';
	import { showSubtitlesPadding, userFonts } from '$lib/stores/LayoutStore';
	import { currentProject } from '$lib/stores/ProjectStore';
	import { cursorPosition, getLastClipEnd } from '$lib/stores/TimelineStore';
	import { open } from '@tauri-apps/api/dialog';
	import toast from 'svelte-french-toast';

	function backgroundImageButtonClicked() {
		open({
			multiple: false,
			directory: false,
			defaultPath: 'C:\\Users\\User\\Videos',
			filters: [
				{
					name: 'Image',
					extensions: ImgFileExt
				}
			]
		}).then((result) => {
			if (result === null) return;

			// Set the select file as the background image
			$currentProject.projectSettings.globalSubtitlesSettings.backgroundImage = result as string;
		});
	}
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

	<!-- background image -->
	<label for="background-image" class="flex items-center my-2"
		><span class="min-w-40 text-sm xl:text-base">Background Image :</span>

		<button
			class="bg-slate-800 border border-black text-white rounded-lg text-sm px-2 py-1 -ml-7 xl:-ml-2"
			on:click={backgroundImageButtonClicked}
		>
			Upload
		</button>

		{#if $currentProject.projectSettings.globalSubtitlesSettings.backgroundImage}
			<p class="text-sm truncate mx-2" dir="rtl">
				{$currentProject.projectSettings.globalSubtitlesSettings.backgroundImage || ''}
			</p>

			<abbr title="Remove this background image">
				<button
					class="bg-red-800 px-2 rounded-lg border border-black"
					on:click={() =>
						($currentProject.projectSettings.globalSubtitlesSettings.backgroundImage = '')}
				>
					X
				</button></abbr
			>
		{/if}
	</label>

	<Toggle
		text="Enable Color Overlay"
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

	<textarea
		class="bg-transparent border-2 border-slate-500 p-1 rounded-lg w-full text-sm"
		placeholder="Quran Caption"
		rows="3"
		bind:value={$currentProject.projectSettings.globalSubtitlesSettings.creatorText.text}
	></textarea>

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

<div class="border-2 border-slate-500 p-1 rounded-lg -mx-1">
	<h1 class="text-lg font-bold mb-2">Subscribe Button</h1>

	<Toggle
		text="Enable Subscribe Button Animation"
		bind:checked={$currentProject.projectSettings.globalSubtitlesSettings.subscribeButton.enable}
	/>

	<Slider
		title="Start Time"
		unit="s from start"
		min={0.5}
		max={500}
		step={0.5}
		bind:bindValue={$currentProject.projectSettings.globalSubtitlesSettings.subscribeButton
			.startTime}
	/>
</div>

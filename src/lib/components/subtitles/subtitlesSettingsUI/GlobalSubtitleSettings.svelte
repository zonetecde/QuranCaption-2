<script lang="ts">
	import Slider from '$lib/components/common/Slider.svelte';
	import Toggle from '$lib/components/common/Toggle.svelte';
	import { ImgFileExt } from '$lib/ext/File';
	import type { SubtitleTrackSettings } from '$lib/models/Project';
	import { showSubtitlesPadding, userFonts } from '$lib/stores/LayoutStore';
	import { currentProject, hasAtLeastOneSubtitle } from '$lib/stores/ProjectStore';
	import { open } from '@tauri-apps/api/dialog';

	let oneSubtitleSettingHasFitInOneLineSettingEnabled = false;

	$: if ($currentProject.projectSettings.subtitlesTracksSettings) {
		oneSubtitleSettingHasFitInOneLineSettingEnabled = Object.values(
			$currentProject.projectSettings.subtitlesTracksSettings
		).some((track: SubtitleTrackSettings) => track.fitOnOneLine);
	}
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

	<div
		class={oneSubtitleSettingHasFitInOneLineSettingEnabled ? 'opacity-50 pointer-events-none' : ''}
	>
		<Slider
			on:focus={() => showSubtitlesPadding.set(true)}
			on:blur={() => showSubtitlesPadding.set(false)}
			title="Horizontal global Padding"
			min={0}
			max={800}
			step={5}
			bind:bindValue={$currentProject.projectSettings.globalSubtitlesSettings.horizontalPadding}
		/>
		{#if oneSubtitleSettingHasFitInOneLineSettingEnabled}
			<p class="text-sm text-white mb-2">
				You need to disable the "Fit in one line" setting for all subtitle tracks to edit this
			</p>
		{/if}
	</div>

	<Slider
		title="Video Scale"
		min={0.05}
		max={7}
		step={0.05}
		bind:bindValue={$currentProject.projectSettings.videoScale}
	/>
	<Slider
		title="Translate Video (X)"
		min={-1000}
		max={1000}
		step={1}
		bind:bindValue={$currentProject.projectSettings.translateVideoX}
	/>
	<Slider
		title="Translate Video (Y)"
		min={-1000}
		max={1000}
		step={5}
		bind:bindValue={$currentProject.projectSettings.translateVideoY}
	/>

	<label class="flex items-center mt-3"
		><span class="mr-1">Portrait Mode (TikTok format) :</span>
		<input
			type="checkbox"
			class="form-checkbox h-5 w-5 text-green-500"
			bind:checked={$currentProject.projectSettings.isPortrait}
		/>
	</label>
</div>

<div class="border-2 border-slate-500 p-1 rounded-lg -mx-1">
	<h1 class="text-lg font-bold mb-2">Subtitle Background</h1>

	<!-- background image -->
	<label for="background-image" class="flex items-center my-2"
		><span class="min-w-40 text-sm xl:text-base">Background Image:</span>

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
	<p class="text-sm text-gray-500 -mt-2 mb-3">Make sure it is 1920x1080</p>

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

<div class="border-2 border-slate-500 p-1 rounded-lg -mx-1 flex flex-col">
	<h1 class="text-lg font-bold mb-2">Surah Name</h1>

	<section class="flex flex-col gap-2">
		<Toggle
			text="Display Surah Name"
			bind:checked={
				$currentProject.projectSettings.globalSubtitlesSettings.surahNameSettings.enable
			}
		/>
		<section class="flex flex-col gap-2">
			<Toggle
				text="Display Surah Name in Latin"
				bind:checked={
					$currentProject.projectSettings.globalSubtitlesSettings.surahNameSettings.showLatin
				}
			/>
			{#if $currentProject.projectSettings.globalSubtitlesSettings.surahNameSettings.showLatin}
				<div class="flex">
					<p>Text:</p>
					<input
						type="text"
						class="ml-1 bg-transparent w-20 border border-slate-500 rounded-lg text-sm px-1"
						bind:value={
							$currentProject.projectSettings.globalSubtitlesSettings.surahNameSettings
								.latinTextBeforeSurahName
						}
					/>
				</div>
			{/if}
		</section>
	</section>

	<Slider
		title="Vertical Position"
		min={-150}
		max={900}
		step={5}
		bind:bindValue={
			$currentProject.projectSettings.globalSubtitlesSettings.surahNameSettings.verticalPosition
		}
	/>

	<Slider
		title="Opacity"
		min={0}
		max={1}
		step={0.01}
		bind:bindValue={
			$currentProject.projectSettings.globalSubtitlesSettings.surahNameSettings.opacity
		}
	/>
	<Slider
		title="Size"
		min={1}
		max={20}
		step={0.5}
		bind:bindValue={$currentProject.projectSettings.globalSubtitlesSettings.surahNameSettings.size}
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
		min={15}
		max={100}
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
		min={-900}
		max={900}
		step={5}
		bind:bindValue={
			$currentProject.projectSettings.globalSubtitlesSettings.creatorText.verticalPosition
		}
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
		bind:bindValue={
			$currentProject.projectSettings.globalSubtitlesSettings.subscribeButton.startTime
		}
	/>

	<label for="font-family" class="mt-2 flex items-center"
		><span class="w-32">Position :</span>
		<select
			class="w-full bg-transparent border-2 border-slate-500 p-1 rounded-lg outline-none"
			bind:value={$currentProject.projectSettings.globalSubtitlesSettings.subscribeButton.position}
		>
			<option class="bg-slate-300 text-black" value="BC">Bottom Center</option>
			<option class="bg-slate-300 text-black" value="BR">Bottom Right</option>
			<option class="bg-slate-300 text-black" value="BL">Bottom Left</option>
			<option class="bg-slate-300 text-black" value="TC">Top Center</option>
			<option class="bg-slate-300 text-black" value="TR">Top Right</option>
			<option class="bg-slate-300 text-black" value="TL">Top Left</option>
		</select>
	</label>
</div>

<div class="border-2 border-slate-500 p-1 rounded-lg -mx-1 flex flex-col">
	<h1 class="text-lg font-bold mb-2">Global Glowing</h1>
	<Toggle
		text="Glow Effect"
		bind:checked={$currentProject.projectSettings.globalSubtitlesSettings.globalGlowEffect}
	/>

	<label for="background-color" class="mt-2"
		><span class="text-sm xl:text-base">Glow color :</span>
		<input
			type="color"
			class="ml-1 bg-transparent w-8 xl:w-12"
			bind:value={$currentProject.projectSettings.globalSubtitlesSettings.globalGlowColor}
		/>
		<!-- hex -->
		<input
			type="text"
			class="ml-1 bg-transparent border border-[#494444] w-16 xl:w-20 text-center -translate-y-1 text-sm xl:text-base"
			bind:value={$currentProject.projectSettings.globalSubtitlesSettings.globalGlowColor}
		/>
	</label>

	<Slider
		title="Glow Radius"
		min={1}
		max={20}
		step={1}
		bind:bindValue={$currentProject.projectSettings.globalSubtitlesSettings.globalGlowRadius}
	/>
	<br />
</div>

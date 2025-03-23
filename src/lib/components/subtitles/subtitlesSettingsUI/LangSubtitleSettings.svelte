<script lang="ts">
	import Slider from '$lib/components/common/Slider.svelte';
	import Toggle from '$lib/components/common/Toggle.svelte';
	import { fullScreenPreview, showSubtitlesPadding, userFonts } from '$lib/stores/LayoutStore';
	import { currentProject } from '$lib/stores/ProjectStore';
	import { cursorPosition } from '$lib/stores/TimelineStore';
	import toast from 'svelte-french-toast';

	export let subtitleLanguage = 'arabic';

	$: if (
		$currentProject.projectSettings.subtitlesTracksSettings[subtitleLanguage].fitOnOneLine ===
			true &&
		$currentProject.projectSettings.subtitlesTracksSettings[subtitleLanguage].neededHeightToFit ===
			-1
	)
		findNeededHeightToBeOneLine();

	$: if (
		$currentProject.projectSettings.subtitlesTracksSettings[subtitleLanguage].fitOnOneLine === false
	)
		$currentProject.projectSettings.subtitlesTracksSettings[subtitleLanguage].neededHeightToFit =
			-1;

	/*
	 * Find the height needed to fit the subtitle on one line
	 */
	async function findNeededHeightToBeOneLine() {
		// pour la langue sélectionnée
		const subtitleClips = $currentProject.timeline.subtitlesTracks[0].clips;

		const fadeDurationBackup = $currentProject.projectSettings.globalSubtitlesSettings.fadeDuration;
		$currentProject.projectSettings.globalSubtitlesSettings.fadeDuration = 0;

		const cursorPosTemp = $cursorPosition;
		const enableTemp =
			$currentProject.projectSettings.subtitlesTracksSettings[subtitleLanguage].enableSubtitles;

		let heightNeeded = -1;
		$currentProject.projectSettings.subtitlesTracksSettings[subtitleLanguage].enableSubtitles =
			true;

		fullScreenPreview.set(true);

		for (let i = 0; i < subtitleClips.length; i++) {
			const clip = subtitleClips[i];

			cursorPosition.set(clip.start + 100);

			await new Promise((resolve) => {
				setTimeout(resolve, 100); // Wait for subtitle to render
			});

			// Get the visible subtitles
			const subtitleParagraph = document.getElementsByClassName(
				'subtitle-text ' + subtitleLanguage
			)[0] as HTMLParagraphElement;

			if (subtitleParagraph && heightNeeded === -1) {
				// change le texte pour qu'il tienne sur une ligne, prend sa hauteur et va faire en sorte que tout les autres
				// sous-titres aient la même hauteur
				const temp = subtitleParagraph.innerHTML;
				if (temp !== '') {
					subtitleParagraph.innerHTML = '.';

					await new Promise((resolve) => {
						setTimeout(resolve, 100); // Wait for subtitle to render
					});

					heightNeeded = subtitleParagraph.clientHeight;
					subtitleParagraph.innerHTML = temp;

					await new Promise((resolve) => {
						setTimeout(resolve, 100); // Wait for subtitle to render
					});

					break;
				}
			}
		}

		if (heightNeeded !== -1) {
			$currentProject.projectSettings.subtitlesTracksSettings[subtitleLanguage].neededHeightToFit =
				heightNeeded;
		}
		$currentProject.projectSettings.globalSubtitlesSettings.fadeDuration = fadeDurationBackup;
		cursorPosition.set(cursorPosTemp);
		$currentProject.projectSettings.subtitlesTracksSettings[subtitleLanguage].enableSubtitles =
			enableTemp;
		fullScreenPreview.set(false);

		toast.success(
			'To change the max font size, uncheck the checkbox, change the font size and check the checkbox again\n\nNote: This will work when being on fullscreen preview',
			{
				duration: 8000
			}
		);
	}
</script>

<Toggle
	text="Enable Subtitles"
	bind:checked={$currentProject.projectSettings.subtitlesTracksSettings[subtitleLanguage]
		.enableSubtitles}
/>

<!-- Font size -->
<div class="-my-3">
	<label for="font-family" class="mt-2 flex items-center"
		><span class="w-32">Font Family :</span>
		<select
			class="w-full bg-transparent border-2 border-slate-500 p-1 rounded-lg outline-none"
			bind:value={$currentProject.projectSettings.subtitlesTracksSettings[subtitleLanguage]
				.fontFamily}
		>
			<option class="bg-slate-300 text-black" value="Hafs">Hafs</option>

			{#each $userFonts as font}
				<option class="bg-slate-300 text-black" value={font}>{font}</option>
			{/each}
		</select>
	</label>

	<div
		class={!$currentProject.projectSettings.subtitlesTracksSettings[subtitleLanguage].fitOnOneLine
			? ''
			: 'opacity-50 pointer-events-none'}
	>
		<Slider
			title="Font Size"
			min={1}
			max={140}
			step={1}
			bind:bindValue={$currentProject.projectSettings.subtitlesTracksSettings[subtitleLanguage]
				.fontSize}
		/>
	</div>

	<label class="mt-4 mb-4">
		<input
			type="checkbox"
			class="ml-1 scale-110"
			bind:checked={$currentProject.projectSettings.subtitlesTracksSettings[subtitleLanguage]
				.fitOnOneLine}
		/>
		<span class="ml-1">Adapt font size to fit on one line</span>
	</label>
	<br />
	<br />

	<label class="mt-2"
		><span>Color :</span>
		<input
			type="color"
			class="ml-1 bg-transparent"
			bind:value={$currentProject.projectSettings.subtitlesTracksSettings[subtitleLanguage].color}
		/>
	</label>

	<!-- Opacity -->
	<Slider
		title="Opacity"
		min={0}
		max={1}
		step={0.01}
		bind:bindValue={$currentProject.projectSettings.subtitlesTracksSettings[subtitleLanguage]
			.opacity}
	/>

	<label class="mt-4">
		<input
			type="checkbox"
			class="ml-1 scale-110"
			bind:checked={$currentProject.projectSettings.subtitlesTracksSettings[subtitleLanguage]
				.showVerseNumber}
		/> <span class="ml-1">Show Verse Number</span>
	</label>

	<!-- alignement (left,center,right,justify) -->
	<label for="alignement" class="mt-2 flex items-center"
		><span class="w-32">Alignement :</span>
		<select
			class="w-full bg-transparent border-2 border-slate-500 p-1 rounded-lg outline-none"
			bind:value={$currentProject.projectSettings.subtitlesTracksSettings[subtitleLanguage]
				.alignment}
		>
			<option class="bg-slate-300 text-black" value="center">Center</option>
			<option class="bg-slate-300 text-black" value="start">Left</option>
			<option class="bg-slate-300 text-black" value="end">Right</option>
			<option class="bg-slate-300 text-black" value="justify">Justify</option>
		</select>
	</label>
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

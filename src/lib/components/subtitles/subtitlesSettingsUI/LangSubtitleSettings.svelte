<script lang="ts">
	import Slider from '$lib/components/common/Slider.svelte';
	import Toggle from '$lib/components/common/Toggle.svelte';
	import { fullScreenPreview, showSubtitlesPadding, userFonts } from '$lib/stores/LayoutStore';
	import { currentProject, hasAtLeastOneSubtitle } from '$lib/stores/ProjectStore';
	import { cursorPosition } from '$lib/stores/TimelineStore';
	import { isCalculatingNeededHeights } from '$lib/stores/VideoPreviewStore';
	import toast from 'svelte-french-toast';

	export let subtitleLanguage = 'arabic';

	$: if (
		$currentProject.projectSettings.subtitlesTracksSettings[subtitleLanguage].fitOnOneLine ===
			true &&
		$currentProject.projectSettings.subtitlesTracksSettings[subtitleLanguage]
			.neededHeightToFitFullScreen === -1
	)
		findNeededHeightToBeOneLine();

	$: if (
		$currentProject.projectSettings.subtitlesTracksSettings[subtitleLanguage].fitOnOneLine === false
	)
		$currentProject.projectSettings.subtitlesTracksSettings[
			subtitleLanguage
		].neededHeightToFitFullScreen = -1;

	/*
	 * Find the height needed to fit the subtitle on one line
	 */
	async function findNeededHeightToBeOneLine() {
		if (hasAtLeastOneSubtitle() === false) {
			toast.error(
				'Please add at least one subtitle to find the height needed to fit the subtitle on one line'
			);
			$currentProject.projectSettings.subtitlesTracksSettings[subtitleLanguage].fitOnOneLine =
				false;
			return;
		}

		isCalculatingNeededHeights.set(true);

		// pour la langue sélectionnée
		const subtitleClips = $currentProject.timeline.subtitlesTracks[0].clips;

		const fadeDurationBackup = $currentProject.projectSettings.globalSubtitlesSettings.fadeDuration;
		$currentProject.projectSettings.globalSubtitlesSettings.fadeDuration = 0;

		const cursorPosTemp = $cursorPosition;
		const enableTemp =
			$currentProject.projectSettings.subtitlesTracksSettings[subtitleLanguage].enableSubtitles;

		let heightNeededSmallPreview = -1;
		let heightNeededFullScreen = -1;

		$currentProject.projectSettings.subtitlesTracksSettings[subtitleLanguage].enableSubtitles =
			true;

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

			if (subtitleParagraph && heightNeededSmallPreview === -1) {
				// change le texte pour qu'il tienne sur une ligne, prend sa hauteur et va faire en sorte que tout les autres
				// sous-titres aient la même hauteur
				const temp = subtitleParagraph.innerHTML;

				if (temp !== '') {
					// créer un str qui fait le bon nbre de ligne max
					let newInnerText = '|||';
					for (
						let i = 1;
						i <
						$currentProject.projectSettings.subtitlesTracksSettings[subtitleLanguage]
							.maxNumberOfLines;
						i++
					) {
						newInnerText += '<br/>|||';
					}

					// met le str dans le sous-titre pour voir la hauteur
					subtitleParagraph.innerHTML = newInnerText;

					await new Promise((resolve) => {
						setTimeout(resolve, 200); // Wait for subtitle to render
					});

					// récupère la hauteur
					heightNeededSmallPreview = subtitleParagraph.clientHeight;
					heightNeededFullScreen = subtitleParagraph.clientHeight;

					// remet le texte original
					subtitleParagraph.innerHTML = temp;

					await new Promise((resolve) => {
						setTimeout(resolve, 100); // Wait for subtitle to render
					});

					break;
				}
			}
		}

		// si on a trouvé la hauteur, on la met dans les settings
		if (heightNeededSmallPreview !== -1) {
			$currentProject.projectSettings.subtitlesTracksSettings[
				subtitleLanguage
			].neededHeightToFitFullScreen = heightNeededFullScreen + 5;

			$currentProject.projectSettings.subtitlesTracksSettings[
				subtitleLanguage
			].neededHeightToFitSmallPreview = heightNeededSmallPreview + 5;

			console.log(
				'Height needed to fit the subtitle on one line (small preview):',
				heightNeededSmallPreview
			);
		} else {
			toast.error(
				'There was an error while trying to find the height needed to fit the subtitle on one line'
			);
		}

		isCalculatingNeededHeights.set(false);

		// remet les settings comme avant
		$currentProject.projectSettings.globalSubtitlesSettings.fadeDuration = fadeDurationBackup;
		$currentProject.projectSettings.subtitlesTracksSettings[subtitleLanguage].enableSubtitles =
			enableTemp;
		fullScreenPreview.set(false);

		const temp = $currentProject.projectSettings.globalSubtitlesSettings.fadeDuration;
		if (temp !== 0) {
			$currentProject.projectSettings.globalSubtitlesSettings.fadeDuration = 0;
			setTimeout(() => {
				$currentProject.projectSettings.globalSubtitlesSettings.fadeDuration = temp;
			}, 0);
			cursorPosition.set(cursorPosTemp);
		}

		await new Promise((resolve) => {
			setTimeout(resolve, 100);
		});
	}
</script>

<Toggle
	text="Enable Subtitles"
	bind:checked={
		$currentProject.projectSettings.subtitlesTracksSettings[subtitleLanguage].enableSubtitles
	}
/>

<!-- Font size -->
<div class="-my-3">
	<label for="font-family" class="mt-2 flex items-center"
		><span class="w-32">Font Family :</span>
		<select
			class="w-full bg-transparent border-2 border-slate-500 p-1 rounded-lg outline-none"
			bind:value={
				$currentProject.projectSettings.subtitlesTracksSettings[subtitleLanguage].fontFamily
			}
		>
			<option class="bg-slate-300 text-black" value="Hafs">Hafs</option>

			{#each $userFonts as font}
				<option class="bg-slate-300 text-black" value={font}>{font}</option>
			{/each}
		</select>
	</label>

	<div
		class={!$currentProject.projectSettings.subtitlesTracksSettings[subtitleLanguage].fitOnOneLine
			? 'mb-2'
			: 'opacity-50 pointer-events-none mb-2'}
	>
		<Slider
			title="Font Size"
			min={1}
			max={140}
			step={1}
			bind:bindValue={
				$currentProject.projectSettings.subtitlesTracksSettings[subtitleLanguage].fontSize
			}
		/>

		<Slider
			title="Line Height"
			min={0.3}
			max={3}
			step={0.1}
			bind:bindValue={
				$currentProject.projectSettings.subtitlesTracksSettings[subtitleLanguage].lineHeight
			}
		/>
	</div>

	<label class="mt-4 mb-4">
		<input
			type="checkbox"
			class="ml-1 scale-110"
			bind:checked={
				$currentProject.projectSettings.subtitlesTracksSettings[subtitleLanguage].fitOnOneLine
			}
		/>
		<span class="ml-1"
			>Adapt font size to fit on
			<select
				class="bg-transparent border-2 border-slate-500 p-1 rounded-lg outline-none"
				disabled={$currentProject.projectSettings.subtitlesTracksSettings[subtitleLanguage]
					.fitOnOneLine}
				bind:value={
					$currentProject.projectSettings.subtitlesTracksSettings[subtitleLanguage].maxNumberOfLines
				}
			>
				<option value={1} class="bg-slate-300 text-black">1</option>
				<option value={2} class="bg-slate-300 text-black">2</option>
				<option value={3} class="bg-slate-300 text-black">3</option>
				<option value={4} class="bg-slate-300 text-black">4</option>
			</select>
			<abbrt
				class="underline decoration-dotted underline-offset-4"
				title="talking about this fontsize - meaning it could be on one line or more but will not exceed the height of N lines of this fontsize"
			>
				line{$currentProject.projectSettings.subtitlesTracksSettings[subtitleLanguage]
					.maxNumberOfLines > 1
					? 's'
					: ''} max
			</abbrt>
		</span>
	</label>

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
		bind:bindValue={
			$currentProject.projectSettings.subtitlesTracksSettings[subtitleLanguage].opacity
		}
	/>

	<label class="mt-4">
		<input
			type="checkbox"
			class="ml-1 scale-110"
			bind:checked={
				$currentProject.projectSettings.subtitlesTracksSettings[subtitleLanguage].showVerseNumber
			}
		/> <span class="ml-1">Show Verse Number</span>
	</label>

	<!-- alignement (left,center,right,justify) -->
	<label for="alignement" class="mt-2 flex items-center"
		><span class="w-32">Alignement :</span>
		<select
			class="w-full bg-transparent border-2 border-slate-500 p-1 rounded-lg outline-none"
			bind:value={
				$currentProject.projectSettings.subtitlesTracksSettings[subtitleLanguage].alignment
			}
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
		bind:checked={
			$currentProject.projectSettings.subtitlesTracksSettings[subtitleLanguage].enableOutline
		}
	/>
	<label for="background-color" class="mt-2"
		><span>Outline Color :</span>
		<input
			type="color"
			class="ml-1 bg-transparent"
			bind:value={
				$currentProject.projectSettings.subtitlesTracksSettings[subtitleLanguage].outlineColor
			}
		/>
	</label>

	<Slider
		title="Outline Thickness"
		min={1}
		max={40}
		step={0.5}
		bind:bindValue={
			$currentProject.projectSettings.subtitlesTracksSettings[subtitleLanguage].outlineThickness
		}
	/>
</div>

<div class="border-2 border-slate-500 p-1 rounded-lg -mx-1">
	<h1 class="text-lg font-bold mb-2">Position</h1>
	<Slider
		title="Vertical Position"
		min={-900}
		max={900}
		step={5}
		bind:bindValue={
			$currentProject.projectSettings.subtitlesTracksSettings[subtitleLanguage].verticalPosition
		}
	/>

	{#if $currentProject.projectSettings.subtitlesTracksSettings[subtitleLanguage].fitOnOneLine}
		<p class="text-xs text-center mt-2">
			To change the horizontal padding, uncheck the `Adapt font size to fit ...` checkbox, change
			the padding and check the checkbox again
		</p>
	{/if}
	<div
		class={$currentProject.projectSettings.subtitlesTracksSettings[subtitleLanguage].fitOnOneLine
			? 'opacity-50 pointer-events-none'
			: ''}
	>
		<Slider
			on:focus={() => showSubtitlesPadding.set(true)}
			on:blur={() => showSubtitlesPadding.set(false)}
			title="Horizontal Padding"
			min={0}
			max={300}
			step={1}
			bind:bindValue={
				$currentProject.projectSettings.subtitlesTracksSettings[subtitleLanguage].horizontalPadding
			}
		/>
	</div>
</div>

<div class="border-2 border-slate-500 p-1 rounded-lg -mx-1">
	<h1 class="text-lg font-bold mb-2">Custom Text Section</h1>
	<label>
		<span
			>Subverse Separator: <span class="text-xs text-gray-400"
				>Use `\n` for a line break. Add spaces around as needed.</span
			>
			<input
				type="text"
				class="w-full mt-1 bg-transparent border-2 border-slate-500 p-1 rounded-lg outline-none"
				bind:value={
					$currentProject.projectSettings.subtitlesTracksSettings[subtitleLanguage]
						.customTextSeparator
				}
				placeholder="\n for line break"
			/>
		</span></label
	>
</div>

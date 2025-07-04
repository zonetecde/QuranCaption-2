<script lang="ts">
	import { importAndReadFile } from '$lib/ext/File';
	import { downloadFile } from '$lib/ext/Utilities';
	import type { GlobalVideoSettings, SubtitleTrackSettings } from '$lib/models/Project';
	import { milisecondsToMMSS } from '$lib/models/Timeline';
	import { selectedSubtitlesLanguage } from '$lib/stores/LayoutStore';
	import { currentProject } from '$lib/stores/ProjectStore';
	import { editions, getEditionFromName } from '$lib/stores/QuranStore';
	import { cursorPosition } from '$lib/stores/TimelineStore';
	import toast from 'svelte-french-toast';
	import GlobalSubtitleSettings from './GlobalSubtitleSettings.svelte';
	import IndividualSubtitleSettingsContainer from './IndividualSubtitleSettingsContainer.svelte';
	import LangSubtitleSettings from './LangSubtitleSettings.svelte';

	async function handleImportSettingsButtonClicked() {
		// import subtitles settings
		const content = await importAndReadFile('Quran Caption Subtitles Settings (*.qc2)');

		if (content) {
			const subtitlesSettings = JSON.parse(content);

			// Mets à jour les settings pour chaque langue
			const subtitlesSettingsLangs = subtitlesSettings[1];

			// migration pour la langue arabe
			if (subtitlesSettingsLangs['arabic'].fitOnOneLine === undefined) {
				subtitlesSettingsLangs['arabic'].fitOnOneLine = false;
				subtitlesSettingsLangs['arabic'].neededHeightToFitFullScreen = -1;
				subtitlesSettingsLangs['arabic'].maxNumberOfLines = 1;
			}

			$currentProject.projectSettings.subtitlesTracksSettings['arabic'] =
				subtitlesSettingsLangs['arabic'];

			// Pour chaque langue dans le fichier
			Object.keys(subtitlesSettingsLangs).forEach((key) => {
				if (key !== 'arabic') {
					// Récupère les 3 premières lettres de la langue pour que même si
					// c'est pas la même traduction, on puisse récupérer les settings
					const lang = key.substring(0, 3);

					// Trouve dans les sous-titre actuelle lequel correspond à la même langue
					Object.keys($currentProject.projectSettings.subtitlesTracksSettings).forEach(
						(langKey) => {
							// Condition qui prends en compte les subtitles settings pour texte (seulement 2 char (en, fr, ...))
							if ((langKey.length >= 3 && langKey.startsWith(lang)) || lang.startsWith(langKey)) {
								const settings: SubtitleTrackSettings = subtitlesSettingsLangs[key];

								// Migration
								if (settings.fitOnOneLine === undefined) {
									settings.fitOnOneLine = false;
									settings.neededHeightToFitFullScreen = -1;
									settings.maxNumberOfLines = langKey === 'arabic' ? 1 : 2;
								}

								$currentProject.projectSettings.subtitlesTracksSettings[langKey] = settings;
							}
						}
					);
				}
			});

			// Mets à jour les settings globaux (bg, fade duration, creator text)
			const globalSubtitlesSettings: GlobalVideoSettings = subtitlesSettings[0];

			// Migration
			if (globalSubtitlesSettings.subscribeButton === undefined) {
				globalSubtitlesSettings.subscribeButton = {
					enable: false,
					startTime: 3,
					position: 'BC'
				};
			}
			if (globalSubtitlesSettings.globalGlowEffect === undefined) {
				globalSubtitlesSettings.globalGlowEffect = false;
				globalSubtitlesSettings.globalGlowColor = '#ffffff';
				globalSubtitlesSettings.globalGlowRadius = 12;
			}
			if (globalSubtitlesSettings.surahNameSettings === undefined) {
				globalSubtitlesSettings.surahNameSettings = {
					enable: false,
					size: 75,
					opacity: 0.8,
					verticalPosition: 10,
					showLatin: true,
					latinTextBeforeSurahName: 'Surah'
				};
			}

			$currentProject.projectSettings.globalSubtitlesSettings = globalSubtitlesSettings;
		}
	}
</script>

<div
	class="w-full h-full flex flex-col pt-3 px-3 gap-y-5 bg-[#1f1f1f] overflow-y-scroll relative overflow-x-hidden"
	id="subtitle-settings-container"
>
	<button
		class="absolute right-2 top-2 group"
		on:click={() => {
			// export the settings
			downloadFile(
				JSON.stringify(
					[
						$currentProject.projectSettings.globalSubtitlesSettings,
						$currentProject.projectSettings.subtitlesTracksSettings
					],
					null,
					2
				),
				`${$currentProject.name} subtitles settings.qc2`
			);
		}}
		><svg
			fill="white"
			width="800px"
			height="800px"
			class="size-5"
			viewBox="0 0 1920 1920"
			xmlns="http://www.w3.org/2000/svg"
		>
			<path
				d="m0 1016.081 409.186 409.073 79.85-79.736-272.867-272.979h1136.415V959.611H216.169l272.866-272.866-79.85-79.85L0 1016.082ZM1465.592 305.32l315.445 315.445h-315.445V305.32Zm402.184 242.372-329.224-329.11C1507.042 187.07 1463.334 169 1418.835 169h-743.83v677.647h112.94V281.941h564.706v451.765h451.765v903.53H787.946V1185.47H675.003v564.705h1242.353V667.522c0-44.498-18.07-88.207-49.581-119.83Z"
				fill-rule="evenodd"
			/>
		</svg>

		<p
			class="absolute -left-1/2 -translate-x-2/3 w-40 bg-[#161313] rounded-xl top-6 hidden group-hover:block"
		>
			Export subtitles settings
		</p>
	</button>
	<button
		class="absolute left-2 xl:right-9 xl:left-auto top-2 group"
		on:click={handleImportSettingsButtonClicked}
		><svg
			fill="white"
			version="1.1"
			xmlns="http://www.w3.org/2000/svg"
			xmlns:xlink="http://www.w3.org/1999/xlink"
			width="800px"
			height="800px"
			class="size-5"
			viewBox="0 0 420.238 420.238"
			xml:space="preserve"
		>
			<g>
				<path
					d="M402.05,7.498l-95.175,0.004c-0.073-0.004-0.146-0.004-0.22-0.004H116.767c-10.028,0-18.188,8.158-18.188,18.188V78.25
		   H17.543C7.855,78.25,0,86.105,0,95.793v299.404c0,9.688,7.854,17.543,17.543,17.543h299.402c9.688,0,17.543-7.855,17.543-17.543
		   V204.015h67.562c10.029,0,18.188-8.16,18.188-18.188V25.685C420.238,15.656,412.079,7.498,402.05,7.498z M35.086,377.654V113.336
		   H98.58v72.492c0,10.027,8.159,18.188,18.188,18.188h73.979v20.191l-45.196,33.266l-15.817-21.487
		   c-1.589-2.158-4.207-3.306-6.87-3.009s-4.966,1.992-6.04,4.445l-38.639,88.268c-0.423,0.966-0.63,1.988-0.63,3.009
		   c0,1.573,0.495,3.137,1.46,4.446c1.588,2.156,4.207,3.304,6.87,3.009l95.764-10.66c2.663-0.297,4.966-1.99,6.04-4.445
		   c1.073-2.456,0.758-5.297-0.83-7.452l-15.816-21.49l59.651-43.908c1.92-1.414,3.054-3.656,3.054-6.041v-38.139h65.655v173.639
		   H35.086V377.654z"
				/>
			</g>
		</svg>

		<p
			class="absolute xl:-left-1/2 xl:-translate-x-2/3 w-40 bg-[#161313] rounded-xl top-6 hidden group-hover:block"
		>
			Import subtitles settings
		</p>
	</button>

	<h2 class="text-lg font-bold text-center">Subtitles Settings</h2>

	<select
		class="w-full bg-transparent border-2 border-slate-500 p-1 rounded-lg outline-none"
		bind:value={$selectedSubtitlesLanguage}
	>
		<option class="bg-slate-300 text-black" value="global">General Settings</option>
		<option class="bg-slate-300 text-black" value="arabic">Global - Arabic</option>

		{#if $editions}
			<!-- Ajoute tout les autres langages -->
			{#each $currentProject.projectSettings.addedTranslations as lang}
				{@const edition = getEditionFromName(lang)}
				{#if edition}
					<option class="bg-slate-300 text-black" value={lang}
						>Global - {edition?.language + ', ' + edition?.author}</option
					>
				{:else}
					<option class="bg-slate-300 text-black" value={lang}>Global - {lang}</option>
				{/if}
			{/each}
		{/if}

		<option class="bg-slate-300 text-black" value="individual">Individual Subtitle Settings</option>
	</select>

	{#if $selectedSubtitlesLanguage === 'global'}
		<GlobalSubtitleSettings />
	{:else if $selectedSubtitlesLanguage !== 'individual'}
		<LangSubtitleSettings subtitleLanguage={$selectedSubtitlesLanguage} />
	{:else}
		<IndividualSubtitleSettingsContainer />
	{/if}
</div>

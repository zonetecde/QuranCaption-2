<script lang="ts">
	import type Project from '$lib/models/Project';
	import '$lib/stores/OtherTextsStore';
	import Header from '$lib/components/header/Header.svelte';
	import ExportPage from '$lib/components/layout/ExportPage.svelte';
	import SubtitleEditor from '$lib/components/layout/SubtitleEditor.svelte';
	import TranslationsEditor from '$lib/components/layout/TranslationsEditor.svelte';
	import VideoEditor from '$lib/components/layout/VideoEditor.svelte';
	import { bestPerformance, currentPage, trimDialog } from '$lib/stores/LayoutStore';
	import { currentProject, getProjectById } from '$lib/stores/ProjectStore';
	import { cursorPosition, scrollPosition, zoom } from '$lib/stores/TimelineStore';
	import { invoke } from '@tauri-apps/api/tauri';
	import { onMount } from 'svelte';
	import { triggerSubtitleResize, initExportSettings } from '$lib/stores/ExportStore';

	onMount(async () => {
		// the slug is what after the ? in the URL
		const slug = window.location.search.split('?')[1];

		const project = await getProjectById(slug);

		if (project === undefined) {
			// If the project is not found, redirect to the home page
			window.location.href = '/';
			return;
		}

		cursorPosition.set(project.projectSettings.cursorPosition);
		zoom.set(project.projectSettings.zoom);
		scrollPosition.set(project.projectSettings.scrollLeft ?? 0);
		bestPerformance.set(project.projectSettings.bestPerformance);

		// Migration - added new settings - need to check if the project has the new settings
		if (project.projectSettings.globalSubtitlesSettings.subscribeButton === undefined) {
			project.projectSettings.globalSubtitlesSettings.subscribeButton = {
				enable: false,
				startTime: 3,
				position: 'BC'
			};
		}
		if (project.projectSettings.globalSubtitlesSettings.globalGlowEffect === undefined) {
			project.projectSettings.globalSubtitlesSettings.globalGlowEffect = false;
			project.projectSettings.globalSubtitlesSettings.globalGlowColor = '#ffffff';
			project.projectSettings.globalSubtitlesSettings.globalGlowRadius = 12;
		}
		for (const [key, value] of Object.entries(project.projectSettings.subtitlesTracksSettings)) {
			if (value.fitOnOneLine === undefined) {
				value.fitOnOneLine = false;
				value.neededHeightToFitFullScreen = -1;
				value.maxNumberOfLines = key === 'arabic' ? 1 : 2;
			}
		}
		if (project.projectSettings.globalSubtitlesSettings.surahNameSettings === undefined) {
			project.projectSettings.globalSubtitlesSettings.surahNameSettings = {
				enable: false,
				size: 75,
				opacity: 0.8,
				verticalPosition: 10,
				showLatin: true,
				latinTextBeforeSurahName: 'Surah'
			};
		}
		// Migraiton pour la version 4.4
		if (project.projectSettings.translateVideoY === undefined) {
			project.projectSettings.translateVideoY = 0;
			project.projectSettings.isPortrait = false;

			// De plus reset toutes les settings de style car la maj change littéralement tout (demande confirmation avant qd même)
			const res = await confirm(
				'Due to recent updates, the horizontal padding, video scale, translations, subtitle positions, and element sizes in this project need to be reset. Do you approve these changes? (Choosing "No" will require manual adjustments to fix display issues.)'
			);
			if (res) {
				project.projectSettings.videoScale = 1;
				project.projectSettings.translateVideoX = 0;
				project.projectSettings.translateVideoY = 0;

				project.projectSettings.globalSubtitlesSettings.horizontalPadding = 100;
				project.projectSettings.globalSubtitlesSettings.surahNameSettings.size = 3;
				project.projectSettings.globalSubtitlesSettings.surahNameSettings.verticalPosition = 70;

				project.projectSettings.globalSubtitlesSettings.creatorText.fontSize = 36;
				project.projectSettings.globalSubtitlesSettings.creatorText.verticalPosition = 755;

				for (const [key, element] of Object.entries(
					project.projectSettings.subtitlesTracksSettings
				)) {
					if (key === 'arabic') {
						element.fontSize = 91;
						element.verticalPosition = -167.7;
						element.horizontalPadding = 0;
						if (element.fitOnOneLine) {
							element.neededHeightToFitFullScreen = 142;
							element.maxNumberOfLines = 1;
							element.neededHeightToFitSmallPreview = 142;
						}
					} else {
						element.fontSize = 50;
						element.verticalPosition = 117;
						element.horizontalPadding = 0;
						if (element.fitOnOneLine) {
							element.neededHeightToFitFullScreen = 155;
							element.maxNumberOfLines = 2;
							element.neededHeightToFitSmallPreview = 155;
						}
					}
				}
			}
		}

		// Set the values for the export settings
		initExportSettings(project);

		// Check if all the assets are still available
		project.assets.forEach((asset) => {
			invoke('do_file_exist', { path: asset.filePath }).then((res) => {
				if (!res) {
					// If the file doesn't exist, update its attribute
					asset.exist = false;
				} else {
					asset.exist = true;
				}
			});
		});
		// Load the project into the store
		currentProject.set(project);

		// Ensure the export settings are applied after the project is loaded into the store
		initExportSettings(project);

		triggerSubtitleResize.set(false);

		// 0.5 sec après le chargement de la page (et donc de la vidéo), on resize les sous-titres
		// (sinon ils apparraisent en minuscule)
		await new Promise((resolve) => {
			setTimeout(resolve, 500);
		});
		triggerSubtitleResize.set(true);
	});
</script>

<div class="h-screen flex flex-col overflow-x-hidden" id="container">
	{#if $currentProject}
		<!-- Top bar -->
		<!-- There's an issue with the top bar, it's making the main window have a scroll bar -->
		<header class="w-full min-h-14 border-b-2 border-[#413f3f]">
			<Header />
		</header>

		<div style="height: calc(100% - 3.5rem);">
			{#if $currentPage === 'Video editor'}
				<VideoEditor />
			{:else if $currentPage === 'Subtitles editor'}
				<SubtitleEditor />
			{:else if $currentPage === 'Translations'}
				<TranslationsEditor />
			{:else if $currentPage === 'Export'}
				<ExportPage />
			{/if}
		</div>
	{:else}
		<div class="flex items-center justify-center h-full">
			<div class="text-2xl">Loading...</div>
		</div>
	{/if}
</div>

{#if $trimDialog !== undefined}
	<div class="absolute inset-0">
		<div class="w-10/12 h-4/6"></div>
	</div>
{/if}

<style>
	#container {
		--s: 140px;
		--c1: #171717;
		--c2: #191919;

		--_g:
			var(--c1) 0% 5%, var(--c2) 6% 15%, var(--c1) 16% 25%, var(--c2) 26% 35%, var(--c1) 36% 45%,
			var(--c2) 46% 55%, var(--c1) 56% 65%, var(--c2) 66% 75%, var(--c1) 76% 85%, var(--c2) 86% 95%,
			#0000 96%;

		background:
			radial-gradient(closest-side at 100% 0, var(--_g)),
			radial-gradient(closest-side at 0 100%, var(--_g)),
			radial-gradient(closest-side, var(--_g)),
			radial-gradient(closest-side, var(--_g)) calc(var(--s) / 2) calc(var(--s) / 2) var(--c1);

		background-size: var(--s) var(--s);
	}
</style>

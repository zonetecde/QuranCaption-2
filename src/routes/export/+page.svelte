<script lang="ts">
	import '$lib/stores/OtherTextsStore';
	import Header from '$lib/components/header/Header.svelte';
	import ExportPage from '$lib/components/layout/ExportPage.svelte';
	import SubtitleEditor from '$lib/components/layout/SubtitleEditor.svelte';
	import TranslationsEditor from '$lib/components/layout/TranslationsEditor.svelte';
	import VideoEditor from '$lib/components/layout/VideoEditor.svelte';
	import {
		bestPerformance,
		currentPage,
		fullScreenPreview,
		trimDialog
	} from '$lib/stores/LayoutStore';
	import { currentProject, getProjectById, initExportSettings } from '$lib/stores/ProjectStore';
	import { cursorPosition, scrollPosition, zoom } from '$lib/stores/TimelineStore';
	import { invoke } from '@tauri-apps/api/tauri';
	import { onMount } from 'svelte';
	import {
		startTime,
		endTime,
		orientation,
		exportType,
		topRatio,
		middleRatio,
		bottomRatio,
		quality,
		currentlyExportingId
	} from '$lib/stores/ExportStore';
	import VideoPreview from '$lib/components/preview/VideoPreview.svelte';
	import { exportCurrentProjectAsVideo } from '$lib/functions/ExportProject';
	import { initializeStorage } from '$lib/ext/LocalStorageWrapper';
	import { listen } from '@tauri-apps/api/event';

	onMount(async () => {
		await initializeStorage();

		// récupère dans l'url le paramètre projectId (?projectId=...&exportId=...)
		const projectId = window.location.search.split('?')[1].split('&')[0].split('=')[1];
		const exportId = window.location.search.split('?')[1].split('&')[1].split('=')[1];

		currentlyExportingId.set(Number(exportId));
		const project = await getProjectById(projectId);

		initExportSettings(project);

		// Fond noir obligatoire pour les exports

		currentProject.set(project);

		// Start the export process
		setTimeout(() => {
			exportCurrentProjectAsVideo();
		}, 2000);
	});
</script>

<div class="h-screen min-h-[1080px] flex flex-col overflow-x-hidden" id="container">
	{#if $currentProject}
		<VideoPreview hideControls />
	{:else}
		<div class="flex items-center justify-center h-full">
			<div class="text-2xl">Loading...</div>
		</div>
	{/if}
</div>

<script lang="ts">
	import '$lib/stores/OtherTextsStore';
	import { currentProject, getProjectById } from '$lib/stores/ProjectStore';
	import { onMount } from 'svelte';
	import {
		currentlyExportingId,
		initExportSettings,
		initExportSettingsFromSettings
	} from '$lib/stores/ExportStore';
	import VideoPreview from '$lib/components/preview/VideoPreview.svelte';
	import { exportCurrentProjectAsVideo } from '$lib/functions/ExportProject';
	import { initializeStorage, localStorageWrapper } from '$lib/ext/LocalStorageWrapper';

	onMount(async () => {
		await initializeStorage();

		// récupère dans l'url le paramètre projectId (?projectId=...&exportId=...)
		const projectId = window.location.search.split('?')[1].split('&')[0].split('=')[1];
		const exportId = window.location.search.split('?')[1].split('&')[1].split('=')[1];

		currentlyExportingId.set(exportId);
		const project = await getProjectById(projectId);

		// Récupère les paramètres d'export depuis le localStorage
		const settings = (await localStorageWrapper.getItem('exportsSettings'))[exportId];
		initExportSettingsFromSettings(settings);

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

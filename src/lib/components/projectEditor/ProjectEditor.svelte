<script lang="ts">
	import { onDestroy, onMount } from 'svelte';
	import { getCurrentWindow } from '@tauri-apps/api/window';
	import VideoPreview from './videoPreview/VideoPreview.svelte';
	import Timeline from './timeline/Timeline.svelte';
	import Navigator from './Navigator.svelte';
	import { globalState } from '$lib/runes/main.svelte';
	import { ProjectEditorTabs } from '$lib/classes';
	import VideoEditor from './tabs/videoEditor/VideoEditor.svelte';
	import SubtitlesEditor from './tabs/subtitlesEditor/SubtitlesEditor.svelte';

	let saveInterval: any;

	onMount(() => {
		// Sauvegarde automatique du projet toutes les 5 secondes
		saveInterval = setInterval(() => {
			globalState.currentProject?.save();
		}, 5000);
	});

	onDestroy(() => {
		clearInterval(saveInterval);
	});
</script>

<div class="flex flex-col h-full bg-secondary min-h-0 overflow-hidden">
	<Navigator />

	{#if globalState.currentProject!.projectEditorState.currentTab === ProjectEditorTabs.VideoEditor}
		<VideoEditor />
	{:else if globalState.currentProject!.projectEditorState.currentTab === ProjectEditorTabs.SubtitlesEditor}
		<SubtitlesEditor />
	{/if}
</div>

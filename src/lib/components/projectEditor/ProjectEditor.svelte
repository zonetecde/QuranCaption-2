<script lang="ts">
	import { onMount } from 'svelte';
	import { getCurrentWindow } from '@tauri-apps/api/window';
	import VideoPreview from './videoPreview/VideoPreview.svelte';
	import Timeline from './timeline/Timeline.svelte';
	import Navigator from './Navigator.svelte';
	import { globalState } from '$lib/runes/main.svelte';
	import { ProjectEditorTabs } from '$lib/classes';
	import VideoEditor from './tabs/videoEditor/VideoEditor.svelte';
	import DropOverlay from './tabs/videoEditor/assetsManager/DropOverlay.svelte';

	onMount(() => {
		// Sauvegarde automatique du projet toutes les 5 secondes
		setInterval(() => {
			globalState.currentProject?.save();
		}, 5000);
	});
</script>

<div class="flex flex-col min-h-full overflow-x-hidden bg-secondary">
	<Navigator />

	{#if globalState.projectEditorState.currentTab === ProjectEditorTabs.VideoEditor}
		<VideoEditor />
	{/if}
</div>

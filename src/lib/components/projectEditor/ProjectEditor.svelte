<script lang="ts">
	import { onMount } from 'svelte';
	import { getCurrentWindow } from '@tauri-apps/api/window';
	import TitleBar from './TitleBar.svelte';
	import VideoPreview from './videoPreview/VideoPreview.svelte';
	import Timeline from './timeline/Timeline.svelte';
	import Navigator from './Navigator.svelte';
	import { globalState } from '$lib/runes/main.svelte';
	import { ProjectEditorTabs } from '$lib/classes';
	import VideoEditor from './tabs/videoEditor/VideoEditor.svelte';
</script>

<div class="flex flex-col min-h-screen overflow-x-hidden bg-secondary">
	<TitleBar />
	<Navigator />

	{#if globalState.projectEditorState.currentTab === ProjectEditorTabs.VideoEditor}
		<VideoEditor />
	{/if}
</div>

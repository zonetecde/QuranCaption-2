<script lang="ts">
	import { currentProject } from '$lib/stores/ProjectStore';
</script>

{#if $currentProject.projectSettings.globalSubtitlesSettings.background}
	<div
		class="absolute inset-0"
		style={`opacity: ${$currentProject.projectSettings.globalSubtitlesSettings.backgroundOpacity}; background-color: ${$currentProject.projectSettings.globalSubtitlesSettings.backgroundColor}; `}
	></div>
{/if}

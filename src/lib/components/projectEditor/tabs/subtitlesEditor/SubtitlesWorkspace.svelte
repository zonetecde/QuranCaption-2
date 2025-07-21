<script lang="ts">
	import { globalState } from '$lib/runes/main.svelte';
</script>

<section
	class="overflow-hidden min-h-0"
	style="height: {globalState.currentProject!.projectEditorState.videoPreview.videoPreviewHeight}%;"
>
	<div class="w-full h-full border-t-2 border-color">
		<p>Workspace for subtitles editing</p>
	</div>
</section>

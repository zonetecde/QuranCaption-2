<script lang="ts">
	import { TrackType } from '$lib/classes';
	import { globalState } from '$lib/runes/main.svelte';

	let currentVideo = $derived(() => {
		return globalState.currentProject!.content.timeline.getCurrentElementOnTrack(TrackType.Video);
	});
	let currentAudio = $derived(() => {
		return globalState.currentProject!.content.timeline.getCurrentElementOnTrack(TrackType.Audio);
	});

	$inspect(currentVideo());
	$inspect(currentAudio());
</script>

<div class=" h-full flex flex-col bg-black" id="preview-container">
	<div class="bg-transparent" id="preview"></div>
</div>

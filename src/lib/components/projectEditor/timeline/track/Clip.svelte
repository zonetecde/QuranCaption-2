<script lang="ts">
	import type { Clip, Track } from '$lib/classes';

	let {
		clip = $bindable(),
		track = $bindable()
	}: {
		clip: Clip;
		track: Track;
	} = $props();

	let positionLeft = $derived(() => {
		return (clip.startTime / 1000) * track.getPixelPerSecond();
	});
</script>

<div
	class="absolute top-0 left-0 h-full bg-red-400 border"
	style="width: {clip.getWidth()}px; left: {positionLeft()}px;"
></div>

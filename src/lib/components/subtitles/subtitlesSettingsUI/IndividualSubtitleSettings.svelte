<script lang="ts">
	import Slider from '$lib/components/common/Slider.svelte';
	import Toggle from '$lib/components/common/Toggle.svelte';
	import type { SubtitleClip } from '$lib/models/Timeline';
	import { currentProject } from '$lib/stores/ProjectStore';
	import { onMount } from 'svelte';

	export let subtitle: SubtitleClip;
</script>

<div class="w-full border-b-2 border-x-2 border-[#413f3f] p-2 flex flex-col">
	<div class="w-8/12 h-1 bg-[#413f3f] mx-auto" />
	<br />

	<Toggle
		text="Enable Glow Effect"
		bind:checked={$currentProject.projectSettings.individualSubtitlesSettings[subtitle.id]
			.glowEffect}
	/>

	<label for="background-color" class="mt-2"
		><span>Glow color :</span>
		<input
			type="color"
			class="ml-1 bg-transparent"
			bind:value={$currentProject.projectSettings.individualSubtitlesSettings[subtitle.id]
				.glowColor}
		/>
		<!-- hex -->
		<input
			type="text"
			class="ml-1 bg-transparent border border-[#494444] w-20 text-center -translate-y-1"
			bind:value={$currentProject.projectSettings.individualSubtitlesSettings[subtitle.id]
				.glowColor}
		/>
	</label>

	<Slider
		title="Glow Radius"
		min={1}
		max={10}
		step={1}
		bind:bindValue={$currentProject.projectSettings.individualSubtitlesSettings[subtitle.id]
			.glowRadius}
	/>
	<br />

	<div class="w-8/12 h-1 bg-[#413f3f] mx-auto" />
	<br />
	<div class="flex flex-col gap-y-2">
		<Toggle
			text="Bold text"
			bind:checked={$currentProject.projectSettings.individualSubtitlesSettings[subtitle.id].bold}
		/>

		<Toggle
			text="Italic text"
			bind:checked={$currentProject.projectSettings.individualSubtitlesSettings[subtitle.id].italic}
		/>

		<Toggle
			text="Underline text"
			bind:checked={$currentProject.projectSettings.individualSubtitlesSettings[subtitle.id]
				.underline}
		/>
	</div>
</div>

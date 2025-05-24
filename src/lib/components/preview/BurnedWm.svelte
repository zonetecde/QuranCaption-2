<script lang="ts">
	import { currentlyExporting, showWm } from '$lib/stores/ExportStore';
	import { currentProject } from '$lib/stores/ProjectStore';
</script>

{#if $currentlyExporting && $showWm}
	{@const subtitleVerticalPosition =
		$currentProject.projectSettings.globalSubtitlesSettings.surahNameSettings.verticalPosition + 40}
	{@const usedVerticalPos =
		subtitleVerticalPosition < 60
			? 60
			: subtitleVerticalPosition < 160
				? subtitleVerticalPosition
				: 60}
	{@const subtitleTextSize =
		$currentProject.projectSettings.globalSubtitlesSettings.surahNameSettings.size * 1.45}

	<div
		class="absolute top-0 left-1/2 -translate-x-1/2"
		style={`top: ${usedVerticalPos}px; --tw-scale-x: ${subtitleTextSize}; --tw-scale-y: ${subtitleTextSize}; transform: translate(var(--tw-translate-x), var(--tw-translate-y)) rotate(var(--tw-rotate)) skewX(var(--tw-skew-x)) skewY(var(--tw-skew-y)) scaleX(var(--tw-scale-x)) scaleY(var(--tw-scale-y));`}
	>
		<div class="flex items-center justify-center h-full">
			<div class="text-center flex flex-col">
				<img
					class="size-[100px] object-contain"
					src={`wm.png`}
					alt="Made with Quran Caption, @qurancaption on Youtube"
				/>
			</div>
		</div>
	</div>
{/if}

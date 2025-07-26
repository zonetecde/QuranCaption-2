<script lang="ts">
	import { globalState } from '$lib/runes/main.svelte';
</script>

<div class="flex flex-col px-3 pt-3">
	<h2 class="text-center font-bold">Subtitles Editor Settings</h2>
	<br />
	<div class="flex items-center flex-col space-x-2 mb-3 gap-y-2">
		<span class="text-sm text-left">Playback Speed</span>

		<!-- 5 boutons les un a coté des autres, de 0.5x - 1x - 1.5x - 2x - 2.5 -->
		<div class="flex items-center space-x-1">
			{#each [0.5, 1, 1.5, 2, 2.5] as speed}
				<button
					class="px-2 py-1 rounded-md cursor-pointer border border-black text-gray-800 text-sm {globalState
						.currentProject!.projectEditorState.subtitlesEditor.playbackSpeed === speed
						? 'bg-[var(--accent-primary)]  '
						: 'bg-gray-200 '}"
					on:click={() => {
						globalState.currentProject!.projectEditorState.subtitlesEditor.playbackSpeed = speed;
					}}
				>
					{speed}x
				</button>
			{/each}
		</div>

		<br />
		<span class="text-sm text-left">Percentage caption</span>
		<div class="w-full bg-gray-200 rounded-full h-3.5 dark:bg-gray-700 relative">
			<div
				class="bg-[var(--accent-primary)] h-full rounded-full"
				style="width: {globalState.currentProject!.detail.percentageCaptioned}%"
			></div>

			<div class="w-full text-center text-xs absolute top-0">
				{globalState.currentProject!.detail.percentageCaptioned}%
			</div>
		</div>
	</div>
</div>

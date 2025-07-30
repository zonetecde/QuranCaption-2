<script lang="ts">
	import { globalState } from '$lib/runes/main.svelte';
</script>

<div class="bg-secondary h-full border border-color rounded-lg py-6 px-3 space-y-6 border-r-0">
	<!-- En-tête avec icône -->
	<div class="flex gap-x-2 items-center justify-center">
		<span class="material-icons text-accent text-xl">subtitles</span>
		<h2 class="text-xl font-bold text-primary">Subtitles Editor</h2>
	</div>

	<!-- Playback Speed Section -->
	<div class="space-y-3">
		<h3 class="text-sm font-medium text-secondary mb-3">Playback Speed</h3>
		<div class="flex items-center justify-center gap-2">
			{#each [0.5, 1, 1.5, 2, 2.5] as speed}
				<button
					class="px-2 py-2 rounded-lg text-sm font-medium transition-all duration-200 cursor-pointer hover:scale-105 border {globalState
						.currentProject!.projectEditorState.subtitlesEditor.playbackSpeed === speed
						? 'bg-accent-primary text-black border-transparent shadow-lg shadow-blue-500/25'
						: 'bg-secondary text-secondary border-color hover:bg-accent hover:text-primary hover:border-[var(--accent-primary)]'}"
					on:click={() => {
						globalState.currentProject!.projectEditorState.subtitlesEditor.playbackSpeed = speed;
					}}
				>
					{speed}x
				</button>
			{/each}
		</div>
	</div>

	<!-- Options Section -->
	<div class="space-y-4">
		<h3 class="text-sm font-medium text-secondary mb-3">Display Options</h3>

		<div class="bg-accent rounded-lg p-4 space-y-4">
			<div class="flex items-center justify-between">
				<label class="text-sm font-medium text-primary cursor-pointer" for="showWordTranslation">
					Show Word Translation
				</label>
				<input
					id="showWordTranslation"
					type="checkbox"
					bind:checked={
						globalState.currentProject!.projectEditorState.subtitlesEditor.showWordTranslation
					}
					class="w-5 h-5 rounded border-2 border-[var(--accent-primary)] bg-secondary checked:bg-[var(--accent-primary)]
					       focus:ring-2 focus:ring-[var(--accent-primary)]/50 transition-all duration-200 cursor-pointer"
				/>
			</div>

			<div class="flex items-center justify-between">
				<label
					class="text-sm font-medium text-primary cursor-pointer"
					for="showWordTransliteration"
				>
					Show Word Transliteration
				</label>
				<input
					id="showWordTransliteration"
					type="checkbox"
					bind:checked={
						globalState.currentProject!.projectEditorState.subtitlesEditor.showWordTransliteration
					}
					class="w-5 h-5 rounded border-2 border-[var(--accent-primary)] bg-secondary checked:bg-[var(--accent-primary)]
					       focus:ring-2 focus:ring-[var(--accent-primary)]/50 transition-all duration-200 cursor-pointer"
				/>
			</div>
		</div>
	</div>

	<!-- Progress Section -->
	<div class="space-y-3">
		<h3 class="text-sm font-medium text-secondary mb-3">Caption Progress</h3>
		<div class="bg-accent rounded-lg p-4">
			<div class="flex items-center justify-between mb-2">
				<span class="text-sm text-secondary">Completion</span>
				<span class="text-sm font-bold text-accent">
					{globalState.currentProject!.detail.percentageCaptioned}%
				</span>
			</div>
			<div class="w-full bg-secondary rounded-full h-3 relative overflow-hidden">
				<div
					class="bg-gradient-to-r from-[var(--accent-primary)] to-[var(--accent-secondary)] h-full rounded-full
					       transition-all duration-500 ease-out relative"
					style="width: {globalState.currentProject!.detail.percentageCaptioned}%"
				>
					<div class="absolute inset-0 bg-white/20 rounded-full animate-pulse"></div>
				</div>
			</div>
		</div>
	</div>
</div>

<style>
	.animate-pulse {
		animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
	}

	@keyframes pulse {
		0%,
		100% {
			opacity: 1;
		}
		50% {
			opacity: 0;
		}
	}
</style>

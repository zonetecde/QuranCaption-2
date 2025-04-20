<script lang="ts">
	import { fullScreenPreview, videoEditorSelectedTab } from '$lib/stores/LayoutStore';
	import AssetsManager from '../assetsmanager/AssetsManager.svelte';
	import VideoPreview from '../preview/VideoPreview.svelte';
	import SubtitleSettings from '../subtitles/subtitlesSettingsUI/SubtitleSettingsContainer.svelte';
	import Timeline from '../timeline/Timeline.svelte';
</script>

<div class="flex-row w-full h-full grid grid-cols-2-template">
	<!-- Quran and clip explorer -->
	<section
		class="min-w-[220px] divide-y-2 divide-[#413f3f] max-h-full overflow-hidden flex flex-col"
	>
		<section class="flex divide-x-2 divide-[#413f3f]">
			<button
				class="w-full py-2 bg-[#1f1d1d] text-white duration-100"
				class:selected={$videoEditorSelectedTab === 'assets manager'}
				on:click={() => videoEditorSelectedTab.set('assets manager')}
			>
				Assets Manager
			</button>
			<button
				class="w-full py-2 bg-[#1f1d1d] text-white duration-100"
				class:selected={$videoEditorSelectedTab === 'subtitles settings'}
				on:click={() => videoEditorSelectedTab.set('subtitles settings')}
			>
				Subtitles Settings
			</button>
		</section>
		{#if $videoEditorSelectedTab === 'assets manager'}
			<AssetsManager />
		{:else}
			<SubtitleSettings />
		{/if}
	</section>

	<section class="flex-grow flex flex-row divide-x-4 divide-[#413f3f]">
		<!-- Editor -->
		<section class="w-full divide-y-4 divide-[#413f3f]">
			<!-- Video preview -->
			<section class={$fullScreenPreview ? 'absolute inset-0 z-50' : 'h-[65%] max-h-[65%]'}>
				<VideoPreview hideControls={$fullScreenPreview} />
			</section>

			<!-- Timeline -->
			<section class="h-[35%]">
				<Timeline />
			</section>
		</section>
	</section>
</div>

<style>
	/* grid cols 2 : first col 25% the second col 75% */
	.grid-cols-2-template {
		grid-template-columns: 25% 75%;
	}

	.selected {
		background-color: #202c1c;
		color: white;
	}
</style>

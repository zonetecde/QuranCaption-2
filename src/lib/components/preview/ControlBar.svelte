<script lang="ts">
	import { secondsToHHMMSS } from '$lib/models/Timeline';
	import { fullScreenPreview } from '$lib/stores/LayoutStore';
	import { currentProject } from '$lib/stores/ProjectStore';
	import { getLastClipEnd } from '$lib/stores/TimelineStore';
	import { isPreviewPlaying } from '$lib/stores/VideoPreviewStore';

	export let currentTime: [string, string];
	export let handlePlayVideoButtonClicked: () => void;
</script>

<section id="controles" class="h-16 w-full bg-[#141616] border-t-2 border-[#363232]">
	<div class="flex flex-row items-center justify-center h-full w-full relative">
		<p class="monospace text-lg absolute left-4 rounded-xl bg-[#110f0f] px-3 py-1">
			{currentTime[0]}<span class="text-xs">.{currentTime[1]}</span> / {secondsToHHMMSS(
				getLastClipEnd($currentProject.timeline)
			)[0]}
		</p>

		<button class="bg-slate-950 w-10 p-1 rounded-full" on:click={handlePlayVideoButtonClicked}>
			{#if $isPreviewPlaying}
				<svg
					xmlns="http://www.w3.org/2000/svg"
					fill="none"
					viewBox="0 0 24 24"
					stroke-width="1.5"
					stroke="currentColor"
				>
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						d="M15.75 5.25v13.5m-7.5-13.5v13.5"
					/>
				</svg>
			{:else}
				<svg
					xmlns="http://www.w3.org/2000/svg"
					fill="none"
					viewBox="0 0 24 24"
					stroke-width="1.5"
					stroke="currentColor"
					class="ml-0.5"
				>
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.347a1.125 1.125 0 0 1 0 1.972l-11.54 6.347a1.125 1.125 0 0 1-1.667-.986V5.653Z"
					/>
				</svg>
			{/if}
		</button>

		<p class="absolute right-12 opacity-50">Press F11 to toggle full screen</p>
		<button
			class="absolute right-3 h-12 w-6 opacity-50"
			on:click={() => fullScreenPreview.set(true)}
		>
			<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 448 512" fill="white">
				<!--!Font Awesome Free 6.7.2 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license/free Copyright 2025 Fonticons, Inc.--><path
					d="M32 32C14.3 32 0 46.3 0 64l0 96c0 17.7 14.3 32 32 32s32-14.3 32-32l0-64 64 0c17.7 0 32-14.3 32-32s-14.3-32-32-32L32 32zM64 352c0-17.7-14.3-32-32-32s-32 14.3-32 32l0 96c0 17.7 14.3 32 32 32l96 0c17.7 0 32-14.3 32-32s-14.3-32-32-32l-64 0 0-64zM320 32c-17.7 0-32 14.3-32 32s14.3 32 32 32l64 0 0 64c0 17.7 14.3 32 32 32s32-14.3 32-32l0-96c0-17.7-14.3-32-32-32l-96 0zM448 352c0-17.7-14.3-32-32-32s-32 14.3-32 32l0 64-64 0c-17.7 0-32 14.3-32 32s14.3 32 32 32l96 0c17.7 0 32-14.3 32-32l0-96z"
				/></svg
			>
		</button>
	</div>
</section>

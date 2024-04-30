<script lang="ts">
	import type { Track } from '$lib/classes/Timeline';
	import LeftPart from './LeftPart.svelte';
	import { zoom } from '$lib/stores/TimelineStore';
	import { getAssetFromId } from '$lib/ext/Id';

	export let track: Track;

	function handleMoveClipLeft(index: number): any {
		const temp = track.clips[index - 1];
		track.clips[index - 1] = track.clips[index];
		track.clips[index] = temp;

		// Recalculate the start and end of the clips
		track.clips.forEach((clip, i) => {
			if (i === 0) {
				clip.start = 0;
				clip.end = clip.duration;
			} else {
				clip.start = track.clips[i - 1].end;
				clip.end = clip.start + clip.duration;
			}
		});
	}
	function handleMoveClipRight(index: number): any {
		const temp = track.clips[index + 1];
		track.clips[index + 1] = track.clips[index];
		track.clips[index] = temp;

		// Recalculate the start and end of the clips
		track.clips.forEach((clip, i) => {
			if (i === 0) {
				clip.start = 0;
				clip.end = clip.duration;
			} else {
				clip.start = track.clips[i - 1].end;
				clip.end = clip.start + clip.duration;
			}
		});
	}

	function generateBlueColor(uniqueId: string): string {
		const hash = uniqueId
			.split('')
			.reduce((acc, char) => char.charCodeAt(0) + ((acc << 5) - acc), 0);

		const r = ((hash & 0x000000ff) % 40) + 83;
		const g = (((hash & 0x0000ff00) >> 8) % 40) + 140;
		const b = (((hash & 0x00ff0000) >> 16) % 40) + 150;

		return `rgb(${r}, ${g}, ${b})`;
	}

	function generatePinkColor(uniqueId: string): string {
		const hash = uniqueId
			.split('')
			.reduce((acc, char) => char.charCodeAt(0) + ((acc << 5) - acc), 0);

		const r = ((hash & 0x000000ff) % 40) + 200;
		const g = (((hash & 0x0000ff00) >> 8) % 40) + 83;
		const b = (((hash & 0x00ff0000) >> 16) % 40) + 140;

		return `rgb(${r}, ${g}, ${b})`;
	}

	function handleDelClipButtonClicked(i: number): any {
		track.clips.splice(i, 1);
		track.clips.forEach((clip, i) => {
			if (i === 0) {
				clip.start = 0;
				clip.end = clip.duration;
			} else {
				clip.start = track.clips[i - 1].end;
				clip.end = clip.start + clip.duration;
			}
		});

		track.clips = track.clips;
	}
</script>

<div class="h-20 flex flex-row border-y-2 border-[#1d1b1b] text-xs w-max min-w-full">
	<LeftPart>
		<p>{track.type}</p>
		<p class="mt-auto underline">Name:</p>
		<input
			type="text"
			bind:value={track.name}
			class="bg-transparent text-white outline-none select-none"
		/>
	</LeftPart>

	<div class="flex flex-col w-full z-10 bg-[#2d2b2b]">
		<div class="flex flex-row h-full">
			{#each track.clips as clip, i}
				{@const asset = getAssetFromId(clip.assetId)}

				{#if asset}
					<div
						class="h-full border-r-2 border-[#1d1b1b] overflow-hidden group relative"
						style="width: {($zoom * clip.duration) / 1000}px; background-color: {asset.type ===
						'video'
							? generateBlueColor(clip.id)
							: generatePinkColor(clip.id)}"
					>
						<div
							class={'flex flex-col p-1.5 pl-2 ' +
								(i > 0 ? 'group-hover:pl-8 ' : '') +
								(i < track.clips.length - 1 ? 'group-hover:pr-8' : '')}
						>
							<p class="text-white text-xs h-10 overflow-y-hidden">{asset.fileName}</p>

							{#if (clip.isMuted !== undefined && asset.type === 'audio') || asset.type === 'video'}
								<button
									class="w-6 h-6 cursor-pointer absolute bottom-1 bg-[#00000049]"
									on:click={() => (clip.isMuted = !clip.isMuted)}
								>
									{#if clip.isMuted}
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
												d="M17.25 9.75 19.5 12m0 0 2.25 2.25M19.5 12l2.25-2.25M19.5 12l-2.25 2.25m-10.5-6 4.72-4.72a.75.75 0 0 1 1.28.53v15.88a.75.75 0 0 1-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.009 9.009 0 0 1 2.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75Z"
											/>
										</svg>
									{:else}
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
												d="M19.114 5.636a9 9 0 0 1 0 12.728M16.463 8.288a5.25 5.25 0 0 1 0 7.424M6.75 8.25l4.72-4.72a.75.75 0 0 1 1.28.53v15.88a.75.75 0 0 1-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.009 9.009 0 0 1 2.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75Z"
											/>
										</svg>
									{/if}
								</button>
							{/if}

							<button
								class={'absolute top-0.5 group-hover:block hidden rounded-full bg-red-200 ' +
									(i < track.clips.length - 1 ? 'right-7' : 'right-0.5')}
								on:click={() => handleDelClipButtonClicked(i)}
							>
								<svg
									xmlns="http://www.w3.org/2000/svg"
									fill="none"
									viewBox="0 0 24 24"
									stroke-width="1.5"
									stroke="red"
									class="w-6 h-6"
								>
									<path
										stroke-linecap="round"
										stroke-linejoin="round"
										d="M15 12H9m12 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
									/>
								</svg>
							</button>
						</div>

						{#if i > 0}
							<button
								class="absolute top-1/2 -translate-y-1/2 bg-black bg-opacity-40 hidden group-hover:block h-full"
								on:click={() => handleMoveClipLeft(i)}
								><svg
									xmlns="http://www.w3.org/2000/svg"
									fill="none"
									viewBox="0 0 24 24"
									stroke-width="1.5"
									stroke="currentColor"
									class="w-6 h-6"
								>
									<path
										stroke-linecap="round"
										stroke-linejoin="round"
										d="M15.75 19.5 8.25 12l7.5-7.5"
									/>
								</svg>
							</button>
						{/if}

						{#if i < track.clips.length - 1}
							<button
								class="absolute right-0 top-1/2 -translate-y-1/2 bg-black bg-opacity-40 hidden group-hover:block h-full"
								on:click={() => handleMoveClipRight(i)}
								><svg
									xmlns="http://www.w3.org/2000/svg"
									fill="none"
									viewBox="0 0 24 24"
									stroke-width="1.5"
									stroke="currentColor"
									class="w-6 h-6"
								>
									<path
										stroke-linecap="round"
										stroke-linejoin="round"
										d="m8.25 4.5 7.5 7.5-7.5 7.5"
									/>
								</svg>
							</button>
						{/if}
					</div>
				{/if}
			{/each}
		</div>
	</div>
</div>

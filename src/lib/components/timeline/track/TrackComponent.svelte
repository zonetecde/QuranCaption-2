<script lang="ts">
	import type { Track } from '$lib/classes/Timeline';
	import LeftPart from './LeftPart.svelte';
	import { zoom } from '$lib/stores/TimelineStore';
	import { getAssetFromId } from '$lib/ext/Id';

	export let track: Track;
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
			{#each track.clips as clip}
				{@const asset = getAssetFromId(clip.assetId)}

				{#if asset}
					<div
						class="h-full border-r-2 border-[#1d1b1b] p-1 overflow-hidden"
						style="width: {($zoom * clip.duration) / 1000}px; background-color: {asset.type ===
						'video'
							? '#538c96'
							: '#a8659f'}"
					>
						<div class="flex flex-col pl-1">
							<p class="text-white text-xs">{asset.fileName}</p>

							{#if (clip.isMuted !== undefined && asset.type === 'audio') || asset.type === 'video'}
								<button
									class="w-6 h-6 cursor-pointer mt-7"
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
						</div>
					</div>
				{/if}
			{/each}
		</div>
	</div>
</div>

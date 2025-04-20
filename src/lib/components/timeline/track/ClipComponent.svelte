<script lang="ts">
	import RelocateAssetWarning from '$lib/components/common/RelocateAssetWarning.svelte';
	import { generateBlueColor, generatePinkColor } from '$lib/ext/Color';
	import type Asset from '$lib/models/Asset';
	import type { Clip, Track } from '$lib/models/Timeline';
	import { zoom } from '$lib/stores/TimelineStore';
	import ContextMenu, { Item } from 'svelte-contextmenu';

	export let asset: Asset;
	export let track: Track;
	export let clip: Clip;
	export let i: number;

	function handleMoveClipLeft(): any {
		const temp = track.clips[i - 1];
		track.clips[i - 1] = track.clips[i];
		track.clips[i] = temp;

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

	function handleMoveClipRight(): any {
		const temp = track.clips[i + 1];
		track.clips[i + 1] = track.clips[i];
		track.clips[i] = temp;

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

	function handleDelClipButtonClicked(): any {
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

		if (track.clips.length === 0 && track.type === 'Video track') {
			// Add the default black video
			track.clips.push({
				id: 'black-video',
				start: 0,
				duration: 7200000,
				end: 7200000,
				assetId: 'black-video',
				fileStartTime: 0,
				fileEndTime: 7200000,
				isMuted: false
			});
		}

		track.clips = track.clips;
	}

	let myMenu: ContextMenu;

	function handleClipClicked(event: MouseEvent & { currentTarget: EventTarget & HTMLDivElement }) {
		if (
			(event.target as HTMLElement).tagName === 'P' ||
			(event.target as HTMLElement).tagName === 'DIV'
		) {
			myMenu.createHandler();
			myMenu.show(event);
		}
	}
</script>

<!-- svelte-ignore a11y-no-static-element-interactions -->
<!-- svelte-ignore a11y-click-events-have-key-events -->
<div
	class="h-full border-r-2 border-[#1d1b1b] overflow-hidden group relative"
	on:click={handleClipClicked}
	style="width: {($zoom * clip.duration) / 1000}px; background-color: {asset.type === 'video'
		? generateBlueColor(clip.id)
		: generatePinkColor(clip.id)}"
>
	<div
		class={'flex flex-col p-1.5 pl-2 ' +
			(i > 0 ? 'group-hover:pl-8 ' : '') +
			(i < track.clips.length - 1 ? 'group-hover:pr-8' : '')}
	>
		<p class="text-white text-xs h-10 overflow-hidden">{asset.fileName}</p>

		{#if ((clip.isMuted !== undefined && asset.type === 'audio') || asset.type === 'video') && clip.isMuted}
			<button
				class="w-6 h-6 cursor-pointer absolute bottom-1 bg-[#00000049]"
				on:click={() => (clip.isMuted = !clip.isMuted)}
			>
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
			</button>
		{/if}
	</div>

	{#if i > 0}
		<button
			class="absolute top-1/2 -translate-y-1/2 bg-black bg-opacity-40 hidden group-hover:block h-full"
			on:click={handleMoveClipLeft}
			><svg
				xmlns="http://www.w3.org/2000/svg"
				fill="none"
				viewBox="0 0 24 24"
				stroke-width="1.5"
				stroke="currentColor"
				class="w-6 h-6"
			>
				<path stroke-linecap="round" stroke-linejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
			</svg>
		</button>
	{/if}

	{#if i < track.clips.length - 1}
		<button
			class="absolute right-0 top-1/2 -translate-y-1/2 bg-black bg-opacity-40 hidden group-hover:block h-full"
			on:click={handleMoveClipRight}
			><svg
				xmlns="http://www.w3.org/2000/svg"
				fill="none"
				viewBox="0 0 24 24"
				stroke-width="1.5"
				stroke="currentColor"
				class="w-6 h-6"
			>
				<path stroke-linecap="round" stroke-linejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
			</svg>
		</button>
	{/if}

	{#if !asset.exist}
		<RelocateAssetWarning style="rounded-tl-none top-0 left-0" assetFilePath={asset.filePath} />
	{/if}
</div>

<ContextMenu bind:this={myMenu}>
	{#if asset.type === 'video' || asset.type === 'audio'}
		<Item autoclose={false} on:click={() => (clip.isMuted = !clip.isMuted)}>
			<div class="flex flex-row items-center gap-x-2">
				{#if !clip.isMuted}
					<svg
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
						class="w-6 h-6"
					>
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							d="M19.114 5.636a9 9 0 0 1 0 12.728M16.463 8.288a5.25 5.25 0 0 1 0 7.424M6.75 8.25l4.72-4.72a.75.75 0 0 1 1.28.53v15.88a.75.75 0 0 1-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.009 9.009 0 0 1 2.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75Z"
						/>
					</svg>
				{/if}
				<p>{clip.isMuted ? 'Unmute' : 'Mute'}</p>
			</div>
		</Item>
	{/if}

	<Item on:click={handleDelClipButtonClicked}>
		<div class="flex flex-row items-center gap-x-2">
			<svg
				xmlns="http://www.w3.org/2000/svg"
				fill="none"
				viewBox="0 0 24 24"
				stroke-width="1.5"
				stroke="white"
				class="w-6 h-6"
			>
				<path
					stroke-linecap="round"
					stroke-linejoin="round"
					d="M15 12H9m12 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
				/>
			</svg>
			<p>Remove from track</p>
		</div></Item
	>
</ContextMenu>

<style>
	.largerCheckbox {
		width: 14px;
		height: 14px;
	}
</style>

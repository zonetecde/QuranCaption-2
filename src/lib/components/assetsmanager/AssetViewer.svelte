<script lang="ts">
	import { convertFileSrc } from '@tauri-apps/api/tauri';
	import { currentProject } from '$lib/stores/ProjectStore';
	import Id from '$lib/ext/Id';
	import { removeAsset } from '$lib/models/Asset';
	import type Asset from '$lib/models/Asset';
	import { open } from '@tauri-apps/api/dialog';
	import { AudioFileExt, ImgFileExt, VideoFileExt } from '$lib/ext/File';
	import RelocateAssetWarning from '../common/RelocateAssetWarning.svelte';
	import toast from 'svelte-french-toast';

	export let asset: Asset;

	let isHovered = false;

	/**
	 * Remove the asset from the store
	 */
	function handleDeleteAssetButtonClicked() {
		removeAsset(asset.id);
	}

	function handleAddInTheTimelineButtonClicked(withAudio = true) {
		switch (asset.type) {
			case 'video':
			case 'image':
				const lastAssetEndTime =
					$currentProject.timeline.videosTracks[0].clips.length > 0
						? $currentProject.timeline.videosTracks[0].clips[
								$currentProject.timeline.videosTracks[0].clips.length - 1
							].end
						: 0;

				if (lastAssetEndTime !== 0) {
					toast(
						"There's currently a bug that prevents the cursor from moving from one video to another. Please consider merging the videos together using a third-party software.",
						{
							icon: '⚠️',
							duration: 6000
						}
					);
				}

				$currentProject.timeline.videosTracks[0].clips.push({
					id: Id.generate(),
					start: lastAssetEndTime,
					duration: asset.duration,
					end: lastAssetEndTime + asset.duration,
					assetId: asset.id,
					fileStartTime: 0,
					fileEndTime: asset.duration,
					isMuted: !withAudio
				});

				break;
			case 'audio':
				const lastAudioEndTime =
					$currentProject.timeline.audiosTracks[0].clips.length > 0
						? $currentProject.timeline.audiosTracks[0].clips[
								$currentProject.timeline.audiosTracks[0].clips.length - 1
							].end
						: 0;

				$currentProject.timeline.audiosTracks[0].clips.push({
					id: Id.generate(),
					start: 0,
					duration: asset.duration,
					end: lastAudioEndTime + asset.duration,
					assetId: asset.id,
					fileStartTime: 0,
					fileEndTime: asset.duration,
					isMuted: !withAudio
				});
				break;
		}

		$currentProject = $currentProject; // Trigger the store update
	}

	/**
	 * Open the file dialog to relocate the asset
	 */
	function relocateAsset() {
		open({
			multiple: false,
			directory: false,
			defaultPath: 'C:\\Users\\User\\Videos',
			filters: [
				{
					name: 'Video | Audio | Image',
					extensions: VideoFileExt.concat(AudioFileExt).concat(ImgFileExt)
				}
			]
		}).then((result) => {
			if (result === null) return;
			asset.filePath = result as string;
			asset.exist = true;
		});
	}
</script>

<!-- svelte-ignore a11y-no-noninteractive-element-interactions -->
<div
	class="group flex items-center justify-between p-2 border-b-2 flex-col max-w-full border-4 border-[#423f3f] rounded-2xl py-4 bg-[#0f0e0e] relative max-h-[250px]"
	on:mouseenter={() => (isHovered = true)}
	on:mouseleave={() => (isHovered = false)}
	role="contentinfo"
>
	<div class="flex items-center h-[65%]">
		{#if asset.type === 'video'}
			<video
				src={convertFileSrc(asset.filePath)}
				class="w-full object-cover h-full"
				controls={isHovered}
			>
				<track kind="captions" />
			</video>
		{:else if asset.type === 'image'}
			<img
				src={convertFileSrc(asset.filePath)}
				class="w-full object-cover max-h-40"
				alt={asset.filePath}
			/>
		{:else if asset.type === 'audio'}
			<img
				src="/icons/audio.png"
				class="w-full h-16 object-contain block group-hover:hidden"
				alt={asset.filePath}
			/>

			<audio
				src={convertFileSrc(asset.filePath)}
				class="w-40 h-16 hidden group-hover:block"
				controls
			></audio>
		{:else}
			<p class="text-white">Unsupported file type</p>
		{/if}
	</div>

	<p class="text-white mt-4 text-center xl:text-sm text-base truncate w-full">{asset.fileName}</p>

	<button
		class="w-6 h-6 absolute -top-3 -right-3 bg-white rounded-full hidden group-hover:block cursor-pointer"
		on:click={handleDeleteAssetButtonClicked}
	>
		<svg
			xmlns="http://www.w3.org/2000/svg"
			fill="none"
			viewBox="0 0 24 24"
			stroke-width="3"
			stroke="darkred"
		>
			<path
				stroke-linecap="round"
				stroke-linejoin="round"
				d="M15 12H9m12 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
			/>
		</svg>
	</button>

	{#if isHovered}
		<button
			class="absolute w-full bg-[#1b422a] py-2 -bottom-8 rounded-b-xl border-x-4 border-b-4 border-[#423f3f] hover:bg-[#112b1b] z-40"
			on:click={() => handleAddInTheTimelineButtonClicked()}>Add in the timeline</button
		>
		{#if asset.type === 'video'}
			<button
				class="absolute w-full bg-[#1b422a] py-2 -bottom-[5.3rem] px-1 rounded-b-xl text-sm border-x-4 border-b-4 border-[#423f3f] hover:bg-[#112b1b] z-40"
				on:click={() => handleAddInTheTimelineButtonClicked(false)}
				>Add in the timeline without the audio</button
			>
		{/if}
		{#if !asset.exist}
			<button
				class="absolute w-full bg-[#1b422a] py-2 -bottom-[7.3rem] rounded-b-xl border-x-4 border-b-4 border-[#423f3f] hover:bg-[#112b1b] z-40"
				on:click={() => relocateAsset()}>Relocate asset</button
			>
		{/if}
	{/if}

	{#if !asset.exist}
		<RelocateAssetWarning style="-top-2 -left-2" assetFilePath={asset.filePath} />
	{/if}
</div>

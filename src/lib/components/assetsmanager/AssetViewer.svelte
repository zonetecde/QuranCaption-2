<script lang="ts">
	import { AudioFileExt, ImgFileExt, VideoFileExt } from '$lib/ext/File';
	import Id from '$lib/ext/Id';
	import type Asset from '$lib/models/Asset';
	import { downloadFromYoutube, removeAsset } from '$lib/models/Asset';
	import { currentProject, updateUsersProjects } from '$lib/stores/ProjectStore';
	import { open } from '@tauri-apps/api/dialog';
	import { convertFileSrc } from '@tauri-apps/api/tauri';
	import toast from 'svelte-french-toast';
	import RelocateAssetWarning from '../common/RelocateAssetWarning.svelte';
	import { ASSETS_PATH } from '$lib/ext/LocalStorageWrapper';

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
				if (
					$currentProject.timeline.videosTracks[0].clips.length === 1 &&
					$currentProject.timeline.videosTracks[0].clips[0].id === 'black-video'
				) {
					// Remove this clip as it is the default black video
					$currentProject.timeline.videosTracks[0].clips = [];
				}

				const lastAssetEndTime =
					$currentProject.timeline.videosTracks[0].clips.length > 0
						? $currentProject.timeline.videosTracks[0].clips[
								$currentProject.timeline.videosTracks[0].clips.length - 1
							].end
						: 0;

				if (lastAssetEndTime !== 0) {
					toast(
						'Please note that the built-in export feature only processes the first clip. Any subsequent clips will be ignored, resulting in a black screen at the end of your video. To avoid this, consider using an external tool to concatenate your videos.',
						{
							icon: 'ℹ️',
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

				if (asset.type === 'image') {
					toast(
						'Please use the "Background Image" option in the Global Subtitles Settings to add a background image.',
						{
							icon: 'ℹ️',
							duration: 6000
						}
					);
				}

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

				if (lastAudioEndTime !== 0) {
					toast(
						'Please note that the built-in export feature only processes the first audio clip. Subsequent clips will be ignored, resulting in silence at the end of your video. To include all audio clips, consider using an external tool to concatenate them.',
						{
							icon: 'ℹ️',
							duration: 6000
						}
					);
				}
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

	async function downloadAssetFromYouTube() {
		if (!asset.youtubeUrl) {
			toast.error("This asset doesn't have a youtube url");
			return;
		}

		await toast.promise(
			downloadFromYoutube(
				asset.fileName,
				ASSETS_PATH!.slice(0, -1),
				asset.youtubeUrl,
				asset.type === 'video' ? 'mp4' : 'webm',
				false
			),
			{
				loading: 'Downloading your asset from youtube...',
				success: 'Download completed !',
				error: 'An error occured while downloading the video'
			}
		);

		// update the asset
		asset.filePath = ASSETS_PATH + asset.fileName;
		asset.exist = true;

		// save the project
		await updateUsersProjects($currentProject);
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
		<div class="flex flex-col w-full mt-4">
			<button
				class="w-full bg-[#1b422a] py-2 border border-[#423f3f] hover:bg-[#112b1b] rounded-t-xl"
				on:click={() => handleAddInTheTimelineButtonClicked()}>Add in the timeline</button
			>
			{#if asset.type === 'video'}
				<button
					class="w-full bg-[#1b422a] py-2 px-1 text-sm border-x border-[#423f3f] hover:bg-[#112b1b]"
					on:click={() => handleAddInTheTimelineButtonClicked(false)}
					>Add in the timeline without the audio</button
				>
			{/if}
			{#if !asset.exist}
				<button
					class="w-full bg-[#1b422a] py-2 border-x border-[#423f3f] hover:bg-[#112b1b]"
					on:click={() => relocateAsset()}>Relocate asset</button
				>
				{#if asset.youtubeUrl}
					<button
						class="w-full bg-[#1b422a] py-2 border border-[#423f3f] hover:bg-[#112b1b] rounded-b-xl"
						on:click={() => downloadAssetFromYouTube()}>Download from YouTube</button
					>
				{/if}
			{:else}
				<div class="w-full bg-[#1b422a] py-2 border border-[#423f3f] rounded-b-xl"></div>
			{/if}
		</div>
	{/if}

	{#if !asset.exist}
		<RelocateAssetWarning style="-top-2 -left-2" assetFilePath={asset.filePath} />
	{/if}
</div>

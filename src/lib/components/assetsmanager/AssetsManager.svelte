<script lang="ts">
	import { open } from '@tauri-apps/api/dialog';
	import IconButton from '../common/IconButton.svelte';
	import { convertFileSrc, invoke } from '@tauri-apps/api/tauri';
	import AssetViewer from './AssetViewer.svelte';
	import { currentProject } from '$lib/stores/ProjectStore';
	import { assets } from '$app/paths';
	import { AudioFileExt, ImgFileExt, VideoFileExt } from '$lib/ext/File';
	import { addAssets } from '$lib/models/Asset';
	import toast from 'svelte-french-toast';

	let ytbDownloadPopup = false;
	let youtubeUrl = '';
	let downloadLocation = '';
	let videoFormat = 'mp4';

	function uploadAssets() {
		open({
			multiple: true,
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

			// Add the selected files to the store
			addAssets(result);
		});
	}

	function selectDowloadLocation() {
		open({
			directory: true,
			multiple: false
		})
			.then((res) => {
				if (res) downloadLocation = res as string;
				console.log(downloadLocation);
			})
			.catch((err) => {
				console.error(err);
			});
	}

	async function downloadFromYouTube() {
		if (!youtubeUrl) {
			toast.error('Please enter a youtube url');
			return;
		}

		// Look if a youtube link is referenced in the project creation
		if (!downloadLocation) {
			toast.error('Please select a download location');
			return;
		}

		const path =
			downloadLocation +
			'/' +
			(videoFormat === 'mp3' ? 'base audio' : 'base video') +
			'.' +
			videoFormat;

		// Téléchargement de la vidéo youtube
		await toast.promise(
			invoke('download_youtube_video', {
				format: videoFormat,
				url: youtubeUrl,
				path: path
			}),
			{
				loading: 'Downloading ' + (videoFormat === 'mp3' ? 'audio' : 'video') + ' from youtube...',
				success: 'Download completed !',
				error: 'An error occured while downloading the video'
			}
		);

		await addAssets([path]);

		ytbDownloadPopup = false;
	}
</script>

<div class="flex flex-col h-full overflow-x-hidden overflow-y-scroll relative">
	<div
		class="w-full min-h-12 bg-[#302f2f] border-b-2 border-[#534c4c] flex items-center pl-4 pr-2 sticky top-0 z-20"
	>
		<h1 class="text-white">Assets</h1>
		<IconButton text="Import" on:click={uploadAssets} classes="ml-auto">
			<path
				stroke-linecap="round"
				stroke-linejoin="round"
				d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5"
			/>
		</IconButton>
		<IconButton
			text="From<br/>YouTube"
			on:click={() => {
				ytbDownloadPopup = !ytbDownloadPopup;
			}}
			classes="ml-3 text-sm text-left leading-[14px]"
		>
			<path
				stroke-linecap="round"
				stroke-linejoin="round"
				d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3"
			/>
		</IconButton>
	</div>

	{#if ytbDownloadPopup}
		<div class="px-3 h-[240px]">
			<p class="self-start mt-5">
				Import from youtube (optional) : <sm class="text-sm opacity-50"
					>if the url is invalid, the software will crash!</sm
				>
			</p>
			<input
				type="text"
				class="w-full h-10 border-2 border-black bg-[#272424] rounded-md p-2 mt-2 outline-none"
				bind:value={youtubeUrl}
				placeholder="https://www.youtube.com/watch?v=..."
			/>

			<div class="flex flex-row w-full h-10">
				<!-- button select a download location -->
				<button
					class={'w-1/2 h-full bg-[#272b28] hover:bg-[#0c0c0c] duration-150 text-white mt-4 rounded-md truncate px-1 ' +
						(downloadLocation ? 'text-sm' : '')}
					on:click={() => {
						selectDowloadLocation();
					}}
				>
					{downloadLocation ? downloadLocation : 'Select download location'}
				</button>

				<!-- mp3/mp4 toggle -->
				<div class="flex flex-col ml-3 mt-3">
					<p class="self-start">Format :</p>
					<div class="flex items-center">
						<input
							type="radio"
							id="mp3"
							name="format"
							value="mp3"
							class="mr-2"
							bind:group={videoFormat}
						/>
						<label for="mp3">Audio</label>
						<input
							type="radio"
							id="mp4"
							name="format"
							value="mp4"
							class="ml-4 mr-2"
							bind:group={videoFormat}
						/>
						<label for="mp4">Video</label>
					</div>
				</div>
			</div>

			<button
				class="w-full h-10 bg-[#264e30] hover:bg-[#274b2a] duration-150 text-white mt-8 rounded-md"
				on:click={downloadFromYouTube}
			>
				Download
			</button>
		</div>
	{/if}

	<div class="bg-[#1f1f1f] flex flex-col flex-grow">
		<div class="gap-2 px-3 py-4 xl:grid xl:grid-cols-2 flex flex-col">
			{#if $currentProject.assets.length === 0}
				<p class="text-white text-center mt-5 pr-4 text-sm absolute">
					Click the button above to import videos, audios and images for your project.
				</p>
			{:else}
				{#each $currentProject.assets as asset}
					<AssetViewer bind:asset />
				{/each}
			{/if}
		</div>
	</div>
</div>

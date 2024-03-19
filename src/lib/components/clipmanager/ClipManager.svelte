<script lang="ts">
	import { VideoExt as VideoFileExt, getFileNameFromPath } from '$lib/FileExt';
	import { addClips, clips } from '$lib/Store';
	import { open } from '@tauri-apps/api/dialog';
	import Button from '../common/Button.svelte';
	import { convertFileSrc } from '@tauri-apps/api/tauri';

	function selectVideoClip() {
		open({
			multiple: true,
			directory: false,
			defaultPath: 'C:\\Users\\User\\Videos',
			filters: [
				{
					name: 'Video files containing Quran recitation',
					extensions: VideoFileExt
				}
			]
		}).then((result) => {
			if (result === null) return;

			// Ajoute la vidéo à la liste des vidéos
			addClips(result);
		});
	}
</script>

<div class="w-full h-full">
	<div
		class="w-full h-12 bg-black bg-opacity-45 border-b-2 border-[#1f1f1f] flex items-center px-4"
	>
		<h1 class="text-white">Video clips</h1>
		<Button text="Import" on:click={selectVideoClip} classes="ml-auto">
			<path
				stroke-linecap="round"
				stroke-linejoin="round"
				d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5"
			/>
		</Button>
	</div>

	<div class="w-full h-full bg-[#1f1f1f] flex flex-col">
		<div class="flex-grow overflow-y-auto">
			{#if $clips.length === 0}
				<p class="text-white text-center mt-5">
					No video clips<br /><span class="text-sm">Click the button above to import some.</span>
				</p>
			{:else}
				{#each $clips as video}
					<div class="flex items-center justify-between p-2 border-b-2 border-[#1f1f1f] flex-col">
						<video src={convertFileSrc(video)} class="w-full object-cover" controls>
							<track kind="captions" />
						</video>
						<p class="text-white truncate">
							{getFileNameFromPath(video)}
						</p>
					</div>
				{/each}
			{/if}
		</div>
	</div>
</div>

<script lang="ts">
	import { onMount } from 'svelte';
	import SvelteMarkdown from 'svelte-markdown';
	import { fade } from 'svelte/transition';
	import { open as openLink } from '@tauri-apps/api/shell';
	import { GITHUB_API_URL, GITHUB_DOWNLOAD_LINK, SOFTWARE_VERSION } from '$lib/ext/GlobalVariables';

	let newUpdateAvailable = false;
	let newUpdateDescription = '';

	onMount(async () => {
		// Check if a new version is available
		const response = await fetch(GITHUB_API_URL);
		if (response.ok) {
			const data = await response.json();

			if (data.tag_name !== SOFTWARE_VERSION) {
				newUpdateAvailable = true;
				newUpdateDescription = data.body;
			}
		}
	});
</script>

{#if newUpdateAvailable}
	<div transition:fade class="absolute inset-0 backdrop-blur-sm flex items-center justify-center">
		<div
			class="relative w-[600px] bg-default border-2 border-black rounded-xl p-4 flex flex-col items-center"
		>
			<button
				class="w-6 h-6 absolute top-2 right-2 cursor-pointer border rounded-full"
				on:click={() => (newUpdateAvailable = false)}
			>
				<svg
					xmlns="http://www.w3.org/2000/svg"
					fill="none"
					viewBox="0 0 24 24"
					stroke-width="1.5"
					stroke="gray"
				>
					<path stroke-linecap="round" stroke-linejoin="round" d="M6 18 18 6M6 6l12 12" />
				</svg>
			</button>

			<p class="self-start text-center w-full">A new version of Quran Caption is available !</p>

			<div class="mt-5 max-h-80 overflow-y-auto bg-black p-2 -mx-2">
				<SvelteMarkdown source={newUpdateDescription} />
			</div>
			<button
				class="w-1/2 h-10 bg-[#186435] hover:bg-[#163a23] duration-150 text-white mt-4 rounded-md"
				on:click={() => openLink(GITHUB_DOWNLOAD_LINK)}
			>
				Update
			</button>
		</div>
	</div>
{/if}

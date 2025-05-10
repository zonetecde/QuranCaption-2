<script lang="ts">
	import { downloadFile } from '$lib/ext/Utilities';
	import {
		clearSubtitleToEdit,
		currentPage,
		setCurrentPage,
		videoSpeed
	} from '$lib/stores/LayoutStore';
	import { currentProject, updateUsersProjects } from '$lib/stores/ProjectStore';
	import { isPreviewPlaying } from '$lib/stores/VideoPreviewStore';
	import { open as openLink } from '@tauri-apps/api/shell';
	import { onDestroy } from 'svelte';
	import toast from 'svelte-french-toast';

	let pages: string[] = ['Video editor', 'Subtitles editor', 'Translations', 'Export'];
	let enableAutoSave = true;
	let autoSaveInterval: number;

	$: if (enableAutoSave) {
		// save the project every 10 seconds
		if (autoSaveInterval) clearInterval(autoSaveInterval);
		autoSaveInterval = setInterval(async () => {
			await updateUsersProjects($currentProject);
			console.log('Auto saved');
		}, 10000);
	}

	$: if (!enableAutoSave) {
		clearInterval(autoSaveInterval);
	}

	$: onDestroy(() => {
		clearInterval(autoSaveInterval);
	});

	/*
	 * Handle the page change
	 */
	function handlePageChange(page: any) {
		isPreviewPlaying.set(false);
		clearSubtitleToEdit();
		setCurrentPage(page);

		// reset the video speed
		if (page !== 'Subtitles editor') {
			// reset la vitesse de la video
			videoSpeed.set(1);
		}

		// remove focus from the button
		(document.activeElement as HTMLElement).blur();
	}
</script>

<div
	class="w-full h-full bg-black bg-opacity-30 flex items-center justify-center pt-0.5 text-xl gap-x-6 xl:gap-x-[10%] relative"
>
	<aabr
		title="Go back to the home page (and save)"
		class="absolute left-3 top-1/2 -translate-y-1/2 pt-2"
	>
		<button
			on:click={async () => {
				await updateUsersProjects($currentProject);
				window.location.href = '/';
			}}
			><svg
				xmlns="http://www.w3.org/2000/svg"
				fill="none"
				viewBox="0 0 24 24"
				stroke-width="1.5"
				stroke="currentColor"
				class="size-8"
			>
				<path
					stroke-linecap="round"
					stroke-linejoin="round"
					d="m2.25 12 8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25"
				/>
			</svg>
		</button>
	</aabr>
	<aabr title="Save project (CTRL + S)" class="absolute left-14 top-1/2 -translate-y-1/2 pt-2">
		<button
			on:click={async () => {
				await updateUsersProjects($currentProject);
				toast.success('Project saved');
			}}
			><svg
				viewBox="0 0 24 24"
				role="img"
				xmlns="http://www.w3.org/2000/svg"
				aria-labelledby="saveIconTitle"
				stroke="white"
				stroke-width="1.4"
				stroke-linecap="square"
				stroke-linejoin="miter"
				fill="black"
				color="black"
				class="size-9"
			>
				<path
					d="M17.2928932,3.29289322 L21,7 L21,20 C21,20.5522847 20.5522847,21 20,21 L4,21 C3.44771525,21 3,20.5522847 3,20 L3,4 C3,3.44771525 3.44771525,3 4,3 L16.5857864,3 C16.8510029,3 17.1053568,3.10535684 17.2928932,3.29289322 Z"
				/> <rect width="10" height="8" x="7" y="13" /> <rect width="8" height="5" x="8" y="3" />
			</svg>
		</button>
	</aabr>

	<!-- enable autosave -->
	<div class="absolute left-24 top-1/2 -translate-y-1/2 pt-2 opacity-40 hover:opacity-100">
		<div class="flex items-center gap-x-2 flex-col">
			<input
				type="checkbox"
				id="enableAutoSave"
				bind:checked={enableAutoSave}
				class="h-5 w-5"
				style="transform: scale(0.8);"
			/>
			<label for="enableAutoSave" class="text-white text-sm">Autosave</label>
		</div>
	</div>
	<aabr title="Open the Documentation" class="absolute right-14 top-1/2 -translate-y-1/2 pt-2">
		<button
			on:click={() => {
				openLink('https://qurancaption-project.vercel.app/documentation');
			}}
			><svg
				xmlns="http://www.w3.org/2000/svg"
				fill="none"
				viewBox="0 0 24 24"
				stroke-width="1.5"
				stroke="currentColor"
				class="size-8"
			>
				<path
					stroke-linecap="round"
					stroke-linejoin="round"
					d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 5.25h.008v.008H12v-.008Z"
				/>
			</svg>
		</button>
	</aabr>
	<aabr title="Download project" class="absolute right-3 top-1/2 -translate-y-1/2 pt-2">
		<button
			on:click={() => {
				// export the project
				downloadFile(JSON.stringify($currentProject, null, 2), `${$currentProject.name}.qc2`);
			}}
			><svg
				fill="white"
				width="800px"
				height="800px"
				class="size-8"
				viewBox="0 0 1920 1920"
				xmlns="http://www.w3.org/2000/svg"
			>
				<path
					d="m0 1016.081 409.186 409.073 79.85-79.736-272.867-272.979h1136.415V959.611H216.169l272.866-272.866-79.85-79.85L0 1016.082ZM1465.592 305.32l315.445 315.445h-315.445V305.32Zm402.184 242.372-329.224-329.11C1507.042 187.07 1463.334 169 1418.835 169h-743.83v677.647h112.94V281.941h564.706v451.765h451.765v903.53H787.946V1185.47H675.003v564.705h1242.353V667.522c0-44.498-18.07-88.207-49.581-119.83Z"
					fill-rule="evenodd"
				/>
			</svg>
		</button>
	</aabr>

	{#each pages as page, i}
		<button
			class="flex items-center gap-x-2 outline-none {$currentPage === page
				? 'cursor-default'
				: 'opacity-35'}"
			on:click={() => handlePageChange(page)}
		>
			<img src="/icons/{i + 1}.png" alt="1" class="h-10" />
			<p>{page}</p></button
		>
	{/each}
</div>

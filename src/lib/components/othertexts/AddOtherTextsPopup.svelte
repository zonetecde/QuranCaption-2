<script lang="ts">
	import { localStorageWrapper } from '$lib/ext/LocalStorageWrapper';
	import { Type, type Surah } from '$lib/models/Quran';
	import { addOtherTextsPopupVisibility } from '$lib/stores/LayoutStore';
	import { OtherTexts, saveOtherTexts } from '$lib/stores/OtherTextsStore';
	import OtherTextsEditor from './OtherTextsEditor.svelte';
	import OtherTextsList from './OtherTextsList.svelte';

	let selectedText: Surah | null = null;

	async function closePopup() {
		await saveOtherTexts();
		OtherTexts.set($OtherTexts); // trigger reactivity
		addOtherTextsPopupVisibility.set(false);
	}
</script>

<div class="absolute inset-0 bg-black bg-opacity-65 z-20 backdrop-blur-sm">
	<div class="flex items-center justify-center h-full">
		<div
			class="text-white relative min-w-[950px] w-3/4 h-3/4 bg-gray-800 p-4 rounded-lg shadow-lg shadow-black"
		>
			<button
				class="absolute top-2 right-2 text-gray-400 hover:text-gray-200"
				on:click={closePopup}
			>
				<svg
					class="w-6 h-6"
					xmlns="http://www.w3.org/2000/svg"
					fill="none"
					viewBox="0 0 24 24"
					stroke="currentColor"
					stroke-width="2"
				>
					<path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
				</svg>
			</button>

			<h2 class="text-xl font-bold mb-4 text-center">Add Other Texts</h2>
			<p class="mb-4 text-center">
				This section allows you to add other texts, such as poems, mutūn, sharh, or anything else.
			</p>

			<section class="h-3/4 bg-black bg-opacity-20 rounded-2xl mt-8 grid grid-cols-2-template">
				<!-- Left Column -->
				<OtherTextsList bind:selectedText />
				<!-- Right Column -->
				<OtherTextsEditor bind:selectedText />
			</section>

			<button
				class="absolute bottom-1.5 xl:bottom-8 bg-blue-500 -translate-x-1/2 left-1/2 text-white px-4 py-2 rounded hover:bg-blue-600"
				on:click={closePopup}
			>
				Save & Close
			</button>
		</div>
	</div>
</div>

<style>
	.grid-cols-2-template {
		grid-template-columns: 20% 80%;
	}
</style>

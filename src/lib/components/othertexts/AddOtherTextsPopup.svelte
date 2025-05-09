<script lang="ts">
	import { Type, type Surah } from '$lib/models/Quran';
	import { addOtherTextsPopupVisibility } from '$lib/stores/LayoutStore';
	import { OtherTexts } from '$lib/stores/OtherTextsStore';
	import OtherTextsList from './OtherTextsList.svelte';

	let selectedText: Surah | null = null;
</script>

<div class="absolute inset-0 bg-black bg-opacity-65 z-20 backdrop-blur-sm">
	<div class="flex items-center justify-center h-full">
		<div
			class="text-white relative min-w-[950px] w-3/4 h-3/4 bg-gray-800 p-4 rounded-lg shadow-lg shadow-black"
		>
			<h2 class="text-xl font-bold mb-4 text-center">Add Other Texts</h2>
			<p class="mb-4 text-center">
				This section allows you to add other texts, such as poems, mutūn, sharh, or anything else.
			</p>

			<section class="h-3/4 bg-black bg-opacity-20 rounded-2xl mt-8 grid grid-cols-2-template">
				<!-- Left Column -->
				<OtherTextsList bind:selectedText />
				<!-- Right Column -->
				<div class=""></div>
			</section>

			<button
				class="absolute bottom-1.5 xl:bottom-8 bg-blue-500 -translate-x-1/2 left-1/2 text-white px-4 py-2 rounded hover:bg-blue-600"
				on:click={() => addOtherTextsPopupVisibility.set(false)}
			>
				Close
			</button>
		</div>
	</div>
</div>

<style>
	.grid-cols-2-template {
		grid-template-columns: 20% 80%;
	}
</style>

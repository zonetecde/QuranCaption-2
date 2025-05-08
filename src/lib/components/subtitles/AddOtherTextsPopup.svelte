<script lang="ts">
	import { addOtherTextsPopupVisibility } from '$lib/stores/LayoutStore';
</script>

<div class="absolute inset-0 bg-black bg-opacity-65 z-20 backdrop-blur-sm">
	<div class="flex items-center justify-center h-full">
		<div
			class="text-white relative min-w-[700px] w-3/4 h-3/4 bg-gray-800 p-4 rounded-lg shadow-lg shadow-black"
		>
			<h2 class="text-xl font-bold mb-4 text-center">Add Other Texts</h2>
			<p class="mb-4 text-center">
				This section allows you to add other texts, such as poems, mutūn, sharh, or anything else.
			</p>

			<section class="h-3/4 bg-black bg-opacity-20 rounded-2xl mt-8 grid grid-cols-2-template">
				<!-- Left Column -->
				<div class="border-r-4 border-gray-800 p-3">
					<p>Your do not have any other texts yet.</p>
					<p class="text-sm text-gray-400 mt-2">
						You can add your own texts by clicking on the button below.
					</p>
				</div>
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
	@media (min-width: 1280px) {
		.grid-cols-2-template {
			grid-template-columns: 20% 80%;
		}
	}
</style>

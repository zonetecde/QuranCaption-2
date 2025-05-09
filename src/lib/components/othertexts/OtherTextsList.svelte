<script lang="ts">
	import { Type, type Surah } from '$lib/models/Quran';
	import { OtherTexts } from '$lib/stores/OtherTextsStore';

	function addNewTextButtonClick() {
		let newText: Surah = {
			id: $OtherTexts.length + 1,
			name: 'New text',
			transliteration: 'Text name',
			type: Type.OtherText,
			total_verses: 0,
			verses: []
		};

		OtherTexts.set([newText, ...$OtherTexts]);
		selectedText = newText; // Set the selected text to the newly added text
	}

	export let selectedText: Surah | null = null;
</script>

<div class="border-r-4 border-gray-800 pt-3 h-full relative flex flex-col pb-20">
	{#if $OtherTexts.length > 0}
		{#each $OtherTexts as text}
			<div
				class="flex items-center justify-between mb-2 hover:bg-black hover:bg-opacity-30 py-1 px-2"
			>
				<button class="cursor-pointer w-full text-left">
					<p class="text-sm text-gray-300">{text.name}</p>
				</button>
				<!-- <button
									class="text-red-500 hover:text-red-700"
									on:click={() => {
										OtherTexts.set($OtherTexts.filter((t) => t.id !== text.id));
									}}
								>
									Delete
								</button> -->
			</div>
		{/each}
	{:else}
		<div class="px-3 text-center flex flex-col">
			<p>Your do not have any other texts yet.</p>
			<p class="text-sm text-gray-400 mt-3">
				You can add your own texts by clicking on the button below.
			</p>
		</div>
	{/if}
	<button
		class="absolute bottom-3 left-1/2 -translate-x-1/2 w-3/4 text-sm bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
		on:click={addNewTextButtonClick}
	>
		Add New Text
	</button>
</div>

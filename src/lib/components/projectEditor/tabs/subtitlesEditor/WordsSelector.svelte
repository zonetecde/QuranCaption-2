<script lang="ts">
	let { selectedVerse } = $props();
</script>

<section
	class="w-full items-center h-full flex flex-row-reverse py-10 xl:leading-[4.5rem] leading-[4rem] my-auto px-6 overflow-y-auto xl:pb-20 flex-wrap text-4xl xl:text-5xl arabic gap-y-4 gap-x-5 content-center"
>
	{#await selectedVerse() then verse}
		{#each verse.words as word}
			<button class="flex flex-col outline-none text-center">
				<p class="text-center w-full">{word.arabic}</p>
				<p class="text-sm text-thirdly">{word.translation}</p>
			</button>
		{/each}
	{:catch error}
		<p class="text-red-500">Error loading verse: {error.message}</p>
	{/await}
</section>

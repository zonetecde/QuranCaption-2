<script lang="ts">
	import { currentPage, setCurrentPage } from '$lib/stores/LayoutStore';

	let pages: string[] = ['Video editor', 'Subtitle editor', 'Export'];

	function handlePageChange(page: any) {
		setCurrentPage(page);
	}
</script>

<div
	class="w-full h-full bg-black bg-opacity-30 flex items-center justify-center pt-0.5 text-xl gap-x-[10%]"
>
	{#each pages as page, i}
		<button
			class="flex items-center gap-x-2 {$currentPage === page ? 'cursor-default' : 'opacity-35'}"
			on:click={() => handlePageChange(page)}
		>
			<img src="/icons/{i + 1}.png" alt="1" class="h-10" />
			<p>Video editor</p></button
		>
	{/each}
</div>

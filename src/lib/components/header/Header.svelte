<script lang="ts">
	import { currentPage, setCurrentPage } from '$lib/stores/LayoutStore';
	import { currentProject, updateUsersProjects } from '$lib/stores/ProjectStore';

	let pages: string[] = ['Video editor', 'Subtitles editor', 'Export'];

	function handlePageChange(page: any) {
		setCurrentPage(page);
	}
</script>

<div
	class="w-full h-full bg-black bg-opacity-30 flex items-center justify-center pt-0.5 text-xl gap-x-[10%]"
>
	<button
		class="absolute top-0 left-0"
		on:click={() => {
			updateUsersProjects($currentProject);
			window.location.href = '/';
		}}>Save&back</button
	>

	{#each pages as page, i}
		<button
			class="flex items-center gap-x-2 {$currentPage === page ? 'cursor-default' : 'opacity-35'}"
			on:click={() => handlePageChange(page)}
		>
			<img src="/icons/{i + 1}.png" alt="1" class="h-10" />
			<p>{page}</p></button
		>
	{/each}
</div>

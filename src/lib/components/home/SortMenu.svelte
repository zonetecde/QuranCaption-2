<script lang="ts">
	import type { ProjectStatus } from '$lib/models/Project';
	import { fade } from 'svelte/transition';

	export let sortDirection: 'asc' | 'desc' = 'desc';
	export let sortType: 'updatedAt' | 'createdAt' | 'name' | 'duration' | 'reciter' = 'updatedAt';
	export let onlyShowThosesWithStatus: 'any' | ProjectStatus = 'any';
</script>

<div
	transition:fade={{ duration: 150 }}
	class="absolute w-100 z-10 right-[10rem] top-10 bg-[#171717] border-4 border-[#141414] rounded-b-md"
>
	<div class="flex flex-col">
		<section>
			<label for="sortDirection" class="text-white p-2">Sort by :</label>
			<select
				bind:value={sortDirection}
				class="bg-[#171717] text-white p-2 outline-none"
				id="sortDirection"
			>
				<option value="asc">Ascending</option>
				<option value="desc">Descending</option>
			</select>
			<select bind:value={sortType} class="bg-[#171717] text-white p-2 outline-none">
				<option value="updatedAt">Last updated</option>
				<option value="createdAt">Created at</option>
				<option value="name">Name</option>
				<option value="duration">Duration</option>
			</select>
		</section>

		<section>
			<label for="onlyShowThosesWithStatus" class="text-white p-2">With status :</label>
			<select
				bind:value={onlyShowThosesWithStatus}
				class="bg-[#171717] text-white p-2 outline-none"
				id="onlyShowThosesWithStatus"
			>
				<option value="any">Any</option>
				<option value="To caption">To caption</option>
				<option value="Captioning">Captioning</option>
				<option value="To translate">To translate</option>
				<option value="Translating">Translating</option>
				<option value="To export">To export</option>
				<option value="Exported">Exported</option>
				<option value="not set">Not set</option>
			</select>
		</section>
	</div>
</div>

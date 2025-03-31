<script lang="ts">
	import { allStatus, type ProjectStatus } from '$lib/models/Project';
	import { onlyShowThosesWithStatus, sortDirection, sortType } from '$lib/stores/LayoutStore';
	import { fade } from 'svelte/transition';
</script>

<div
	transition:fade={{ duration: 150 }}
	class="absolute w-100 z-10 right-[10rem] top-10 bg-[#171717] border-4 border-[#141414] rounded-b-md"
>
	<div class="flex flex-col">
		<section>
			<label for="sortDirection" class="text-white p-2">Sort by :</label>
			<select
				bind:value={$sortDirection}
				class="bg-[#171717] text-white p-2 outline-none"
				id="sortDirection"
			>
				<option value="asc">Ascending</option>
				<option value="desc">Descending</option>
			</select>
			<select bind:value={$sortType} class="bg-[#171717] text-white p-2 outline-none">
				<option value="updatedAt">Last updated</option>
				<option value="createdAt">Created at</option>
				<option value="name">Name</option>
				<option value="duration">Duration</option>
			</select>
		</section>

		<section>
			<label class="text-white p-2" for="">With status :</label>
			<button
				class="text-white px-2 border rounded-lg opacity-45"
				on:click={() => onlyShowThosesWithStatus.set([])}
			>
				Uncheck all
			</button>
			<div class="flex flex-col text-white p-2">
				{#each allStatus as status}
					<label>
						<input
							checked={$onlyShowThosesWithStatus.includes(status)}
							type="checkbox"
							bind:group={$onlyShowThosesWithStatus}
							value={status}
							class="mr-2"
						/>
						{status}
					</label>
				{/each}
			</div>
		</section>
	</div>
</div>

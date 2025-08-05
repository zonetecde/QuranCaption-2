<script lang="ts">
	import type { Style } from '$lib/classes/VideoStyle.svelte';
	import { invoke } from '@tauri-apps/api/core';
	import { slide } from 'svelte/transition';

	let {
		style = $bindable()
	}: {
		style: Style;
	} = $props();

	let expended = $state(false);
</script>

<div
	class={'flex flex-col duration-150 ' +
		(expended ? 'bg-blue-200/10 rounded-2xl mb-2 px-3 py-2' : 'hover:bg-white/10')}
>
	<div
		class={'flex items-center justify-between py-1 px-1 cursor-pointer ' +
			(expended ? 'border-b border-white/30' : '')}
		onclick={() => (expended = !expended)}
	>
		<span class="text-sm text-primary">{style.name}</span>
		<span class="text-xs text-secondary">{style.value}</span>
	</div>

	{#if expended}
		<div class="my-2" transition:slide>
			<!-- Contenu supplémentaire à afficher lorsque l'élément est développé -->
			<p class="text-xs text-secondary">{style.description}</p>

			<!-- Modificateur de valeur -->
			{#if style.valueType === 'number'}
				<div class="flex gap-x-2 items-center">
					<input
						class="w-full"
						type="range"
						min={style.valueMin}
						max={style.valueMax}
						step={style.step}
						bind:value={style.value}
					/>

					<!-- met aussi un input number -->
					<input
						type="number"
						min={style.valueMin}
						max={style.valueMax}
						step={style.step}
						bind:value={style.value}
						class="w-16"
					/>
				</div>
			{:else if style.valueType === 'color'}
				<div class="flex gap-x-2 items-center">
					<input type="color" bind:value={style.value} class="w-full" />
					<input type="text" bind:value={style.value} class="w-16" />
				</div>
			{:else if style.valueType === 'boolean'}
				<div class="flex gap-x-2 items-center mt-2">
					<input type="checkbox" bind:checked={style.value as boolean} class="w-4 h-4" />
					<span class="text-xs text-secondary">Enabled</span>
				</div>
			{:else if style.valueType === 'select'}
				<select bind:value={style.value} class="w-full mt-1">
					{#if style.id === 'font-family'}
						{#await invoke('get_system_fonts')}
							<option value="" disabled selected>Loading fonts...</option>
						{:then fonts: any}
							<option value="Hafs">Hafs (Qur'an Font)</option>
							{#each fonts as font}
								<option value={font}>{font}</option>
							{/each}
						{:catch error}
							<option value="" disabled>Error loading fonts: {error.message}</option>
						{/await}
					{:else}
						{#each style.options || [] as option}
							<option value={option}>{option}</option>
						{/each}
					{/if}
				</select>
			{/if}
		</div>
	{/if}
</div>

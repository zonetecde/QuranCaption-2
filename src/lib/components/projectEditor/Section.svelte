<!-- Représente une section fermable en cliquant sur le bout de flèche -->
<script lang="ts">
	import { globalState } from '$lib/runes/main.svelte';
	import { onMount, type Snippet } from 'svelte';
	import { slide } from 'svelte/transition';

	let {
		name,
		icon,
		classes,
		children,
		dataCategory
	}: {
		name: string;
		icon: string;
		classes?: string;
		children: Snippet;
		dataCategory?: string;
	} = $props();

	let extended = $state(true);

	onMount(() => {
		// Init la section dans l'éditeur
		if (!globalState.getSectionsState[name]) {
			globalState.getSectionsState[name] = {
				extended: extended
			};
		} else {
			// Si la section existe déjà, on récupère son état
			extended = globalState.getSectionsState[name].extended;
		}
	});

	$effect(() => {
		globalState.getSectionsState[name] = {
			extended: extended
		};
	});
</script>

<div class="flex flex-col gap-2" data-category={dataCategory}>
	<div class={'flex ' + classes} onclick={() => (extended = !extended)}>
		<h3 class="text-sm font-semibold text-gray-100 flex items-center truncate">
			{#if icon.includes('png') || icon.includes('svg')}
				<img src={icon} alt={name} class="w-6 h-6 mr-2" />{name}
			{:else}
				<span class="material-icons mr-2 text-lg text-indigo-400">{icon}</span>{name}
			{/if}
		</h3>
		<!-- dropdownicon -->
		<button
			class={'flex items-center ml-auto cursor-pointer transition-all duration-100 ' +
				(extended ? 'rotate-180' : '')}
		>
			<span class="material-icons text-4xl! text-indigo-400">arrow_drop_down</span>
		</button>
	</div>

	{#if extended}
		<div transition:slide>
			{@render children()}
		</div>
	{/if}
</div>

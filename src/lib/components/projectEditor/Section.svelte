<!-- Représente une section fermable en cliquant sur le bout de flèche -->
<script lang="ts">
	import { globalState } from '$lib/runes/main.svelte';
	import { onMount, type Snippet } from 'svelte';
	import { slide } from 'svelte/transition';

	let {
		name,
		icon,
		classes,
		children
	}: {
		name: string;
		icon: string;
		classes?: string;
		children: Snippet;
	} = $props();

	let extended = $state(true);

	onMount(() => {
		// Init la section dans l'éditeur
		if (!globalState.sectionsState[name]) {
			globalState.sectionsState[name] = {
				extended: extended
			};
		} else {
			// Si la section existe déjà, on récupère son état
			extended = globalState.sectionsState[name].extended;
		}
	});

	$effect(() => {
		globalState.sectionsState[name] = {
			extended: extended
		};
	});
</script>

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

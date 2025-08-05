<script lang="ts">
	import type { Style } from '$lib/classes/VideoStyle.svelte';

	let {
		style = $bindable()
	}: {
		style: Style;
	} = $props();

	let expended = $state(true);
</script>

<div
	class={'flex flex-col duration-150 ' +
		(expended ? 'bg-yellow-200/10 px-3 py-2' : 'hover:bg-white/10')}
>
	<div
		class="flex items-center justify-between py-1 px-1 cursor-pointer"
		onclick={() => (expended = !expended)}
	>
		<span class="text-sm text-primary">{style.name}</span>
		<span class="text-xs text-secondary">{style.value}</span>
	</div>

	{#if expended}
		<div class="my-2">
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
			{/if}
		</div>
	{/if}
</div>

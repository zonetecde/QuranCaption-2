<script lang="ts">
	import { type TypedCategory } from '$lib/classes/VideoStyle.svelte';
	import { globalState } from '$lib/runes/main.svelte';
	import Section from '../../Section.svelte';

	const styles = $derived(() => {
		return globalState.getVideoStyle;
	});
</script>

<div
	class="bg-secondary h-full border border-color rounded-lg py-6 px-2 space-y-6 relative overflow-hidden"
>
	<!-- En-tête avec icône -->
	<div class="flex gap-x-2 items-center justify-center">
		<span class="material-icons text-accent text-xl">auto_fix_high</span>
		<h2 class="text-xl font-bold text-primary">Video Style</h2>
	</div>

	{#each Object.entries(styles().styles) as [categoryId, _category]}
		{@const category = _category as TypedCategory}
		<Section name={category.name} icon={category.icon}>
			{#each Object.entries(category.styles) as [styleId, style]}
				<div class="flex items-center justify-between mb-4">
					<span class="text-sm text-primary">{style.name}</span>
					<span class="text-xs text-secondary">{style.value}</span>
				</div>
			{/each}
		</Section>
	{/each}
</div>

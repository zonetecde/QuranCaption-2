<script lang="ts">
	import { type Style, type Category } from '$lib/classes/VideoStyle.svelte';
	import { globalState } from '$lib/runes/main.svelte';
	import Section from '../../Section.svelte';
	import StyleComponent from './Style.svelte';

	const styles = $derived(() => {
		return globalState.getVideoStyle;
	});
</script>

<div
	class="bg-secondary h-full border border-color rounded-lg py-6 px-2 space-y-6 relative overflow-y-auto"
>
	<!-- En-tête avec icône -->
	<div class="flex gap-x-2 items-center justify-center">
		<span class="material-icons text-accent text-xl">auto_fix_high</span>
		<h2 class="text-xl font-bold text-primary">Video Style</h2>
	</div>
	<div
		class="flex flex-col gap-y-2 px-1 bg-[var(--bg-primary)]/60 rounded-lg border border-[var(--border-color)]/50"
	>
		{#each styles().styles as category}
			<Section name={category.name} icon={category.icon}>
				{#each category.styles as style, styleIndex}
					{@const categoryIndex = styles().styles.findIndex((c) => c.id === category.id)}
					<StyleComponent
						bind:style={globalState.getVideoStyle.styles[categoryIndex].styles[styleIndex]}
					/>
				{/each}
			</Section>
		{/each}
	</div>
</div>

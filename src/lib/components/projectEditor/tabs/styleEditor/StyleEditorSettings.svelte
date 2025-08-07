<script lang="ts">
	import { type Style, type Category, VideoStyle } from '$lib/classes/VideoStyle.svelte';
	import { globalState } from '$lib/runes/main.svelte';
	import { onMount } from 'svelte';
	import Section from '../../Section.svelte';
	import StyleComponent from './Style.svelte';
	import { fade, slide } from 'svelte/transition';

	const styles = $derived(() => {
		return globalState.getVideoStyle.styles[globalState.getStylesState.getCurrentSelection()];
	});

	let stylesContainer: HTMLDivElement | undefined;

	onMount(async () => {
		stylesContainer!.scrollTop =
			globalState.currentProject!.projectEditorState.stylesEditor.scrollPosition;

		if (
			globalState.getStylesState.currentSelectionTranslation === '' &&
			globalState.getProjectTranslation.addedTranslationEditions.length > 0
		) {
			// Par défaut, on sélectionne la première traduction ajoutée
			globalState.getStylesState.currentSelectionTranslation =
				globalState.getProjectTranslation.addedTranslationEditions[0].name;
		}

		// S'il manque des styles à une traduction, on les ajoute
		for (const translation of globalState.getProjectTranslation.addedTranslationEditions) {
			if (globalState.getVideoStyle.styles[translation.name]) continue;

			globalState.getVideoStyle.styles[translation.name] = await VideoStyle.getDefaultStyles();
		}

		console.log('Styles loaded:', globalState.getVideoStyle.styles);
	});
</script>

<div class="bg-secondary h-full border border-color mx-0.5 rounded-lg pt-6 relative flex flex-col">
	<!-- En-tête avec icône -->
	<div class="flex gap-x-2 items-center justify-center mb-4">
		<span class="material-icons text-accent text-xl">auto_fix_high</span>
		<h2 class="text-xl font-bold text-primary">Video Style</h2>
	</div>

	<div
		class="flex flex-col px-2 py-2 bg-[var(--bg-primary)]/60 border border-b-0 rounded-b-none border-[var(--border-color)]/50 rounded-lg"
	>
		<p>Choose a target</p>
		<div class="w-full grid grid-cols-3 gap-x-2 my-1">
			{#each ['global', 'arabic', 'translation'] as selection}
				<button
					onclick={() => {
						globalState.getStylesState.currentSelection = selection;
					}}
					class={'py-1 ' +
						(globalState.getStylesState.currentSelection === selection ? 'btn-accent' : 'btn')}
				>
					{selection.charAt(0).toUpperCase() + selection.slice(1)}
				</button>
			{/each}
		</div>

		{#if globalState.getStylesState.currentSelection === 'translation'}
			<select
				class="mt-1"
				bind:value={globalState.getStylesState.currentSelectionTranslation}
				transition:slide
			>
				{#each globalState.getProjectTranslation.addedTranslationEditions as translation}
					<option value={translation.name}>{translation.author}</option>
				{/each}
			</select>
		{/if}

		<!-- search bar -->
		<div class="mt-2">
			<input
				type="text"
				placeholder="Search styles..."
				class="w-full px-2 py-1 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border-color)]"
				bind:value={globalState.getStylesState.searchQuery}
			/>
		</div>
	</div>
	<div
		class="flex flex-col gap-y-2 px-2 bg-[var(--bg-primary)]/60 rounded-lg border border-[var(--border-color)]/50 overflow-y-auto pb-10 rounded-t-none border-t-2 flex-1"
		bind:this={stylesContainer}
		onscroll={(e) => {
			globalState.currentProject!.projectEditorState.stylesEditor.scrollPosition =
				stylesContainer?.scrollTop || 0;
		}}
	>
		{#each styles() as category}
			<Section name={category.name} icon={category.icon} classes="-mb-1">
				{#each category.styles as style, styleIndex}
					{@const categoryIndex = styles().findIndex((c) => c.id === category.id)}
					{#if globalState.getStylesState.searchQuery === '' || style.name
							.toLowerCase()
							.includes(globalState.getStylesState.searchQuery.toLowerCase())}
						<!-- Si la recherche est vide ou si le nom du style correspond à la requête de recherche -->
						<StyleComponent
							bind:style={
								globalState.getVideoStyle.styles[globalState.getStylesState.getCurrentSelection()][
									categoryIndex
								].styles[styleIndex]
							}
						/>
					{/if}
				{/each}
			</Section>
		{/each}
	</div>
</div>

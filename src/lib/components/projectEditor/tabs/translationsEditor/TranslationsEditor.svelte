<script lang="ts">
	import { globalState } from '$lib/runes/main.svelte';
	import { onMount } from 'svelte';

	import TranslationsEditorSettings from './TranslationsEditorSettings.svelte';
	import TranslationsWorkspace from './TranslationsWorkspace.svelte';
	import { fade } from 'svelte/transition';
	import AddTranslationModal from './modal/AddTranslationModal.svelte';

	let addTranslationModalVisibility = $state(false);

	onMount(() => {
		// Récupère toutes les traductions disponibles
		globalState.currentProject!.content.projectTranslation.loadAvailableTranslations();
	});
</script>

<div class="flex-grow w-full max-w-full flex overflow-hidden h-full min-h-0">
	<!-- Assets -->
	<section
		class="w-[230px] 2xl:w-[300px] flex-shrink-0 divide-y-2 divide-color max-h-full overflow-hidden flex flex-col"
	>
		<TranslationsEditorSettings
			setAddTranslationModalVisibility={(visible: boolean) =>
				(addTranslationModalVisibility = visible)}
		/>
	</section>
	<section class="flex-1 min-w-0 flex flex-row max-h-full min-h-0">
		<section class="w-full min-w-0 flex flex-col min-h-0">
			<!-- Video preview -->
			<TranslationsWorkspace
				setAddTranslationModalVisibility={(visible: boolean) =>
					(addTranslationModalVisibility = visible)}
			/>
		</section>
	</section>

	<section
		class="hidden 2xl:block w-[250px] flex-shrink-0 divide-y-2 divide-color max-h-full overflow-hidden flex-col border-l-2 border-color border-t-2"
	></section>
</div>

{#if addTranslationModalVisibility}
	<div class="modal-wrapper" transition:fade>
		<AddTranslationModal close={() => (addTranslationModalVisibility = false)} />
	</div>
{/if}

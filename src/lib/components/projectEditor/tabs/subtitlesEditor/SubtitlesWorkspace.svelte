<script lang="ts">
	import { Quran, type Verse } from '$lib/classes/Quran';
	import { globalState } from '$lib/runes/main.svelte';
	import VersePicker from './VersePicker.svelte';
	import WordsSelector from './WordsSelector.svelte';
</script>

<section
	class="overflow-hidden min-h-0 bg-[#0d0d0d]"
	style="height: {globalState.currentProject!.projectEditorState.upperSectionHeight}%;"
>
	<div class="w-full h-full flex flex-col border-t-2 border-color py-1 px-1.5">
		<!-- Sélecteur de verset -->
		<VersePicker />

		<!-- Affichage des mots du verset -->
		<WordsSelector />
	</div>
</section>

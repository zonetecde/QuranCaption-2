<script lang="ts">
	import { importAndReadFile } from '$lib/ext/File';
	import { Type, type Surah } from '$lib/models/Quran';
	import { OtherTexts } from '$lib/stores/OtherTextsStore';
	import { onMount } from 'svelte';

	function addNewTextButtonClick() {
		// nbre aleatoire entre -2 et -9999999
		// pour ne pas avoir de conflit avec les sourates existantes
		const randomId = Math.floor(Math.random() * -9999999) - 2;
		let newText: Surah = {
			id: randomId,
			name: 'New text ' + ($OtherTexts.length + 1),
			transliteration: '',
			type: Type.OtherText,
			total_verses: 0,
			verses: []
		};

		OtherTexts.set([newText, ...$OtherTexts]);
		selectedText = newText; // Set the selected text to the newly added text
	}

	export let selectedText: Surah | null = null;

	onMount(() => {
		// Set the selected text to the first one if it exists
		if ($OtherTexts.length > 0) {
			selectedText = $OtherTexts[0];
		}
	});

	async function importTextButtonClick() {
		// import subtitles settings
		const content = await importAndReadFile('Quran Caption Custom Text (*.qc2)');

		if (content) {
			const customText = JSON.parse(content);

			if (customText) {
				const textId = customText.id;

				const textWithThisId = $OtherTexts.find((text) => text.id === textId);
				if (textWithThisId) {
					// Si on a déjà un texte avec le même id, on demande de le remplacer
					const replace = await confirm(
						'A custom text with the same ID already exists. Do you want to replace it?'
					);
					if (!replace) {
						return;
					}
					// Remplace le texte existant
					$OtherTexts = $OtherTexts.map((__text) => {
						if (__text.id === textId) {
							return customText;
						}
						return __text;
					});
				} else {
					// Ajoute le texte
					$OtherTexts = [customText, ...$OtherTexts];
				}

				// trigger reactivity
				OtherTexts.set($OtherTexts);
				// Set the selected text to the newly added text
				selectedText = customText;
			}
		}
	}
</script>

<div
	class="border-r-4 border-[#171717] bg-[#232121] rounded-l-2xl pt-3 h-full relative flex flex-col pb-20"
>
	{#if $OtherTexts.length > 0}
		<p class="text-center mb-3">Your text{$OtherTexts.length > 1 ? 's' : ''} :</p>
		{#each $OtherTexts as text}
			<div
				class={'flex items-center justify-between mb-2 py-1 px-2 ' +
					(selectedText && selectedText.id === text.id
						? 'bg-gray-700'
						: 'hover:bg-black hover:bg-opacity-30 ')}
			>
				<button class="cursor-pointer w-full text-left" on:click={() => (selectedText = text)}>
					<p class="text-sm text-gray-300">{text.name}</p>
				</button>
				<button
					class="text-red-500 hover:text-red-700"
					on:click={async () => {
						// tauri confirmation dialog
						if (await confirm('Are you sure you want to delete this text?')) {
							OtherTexts.set($OtherTexts.filter((t) => t.id !== text.id));
							if (selectedText && selectedText.id === text.id) {
								selectedText = null; // Deselect the text if it was selected
							}
						}
					}}
				>
					Delete
				</button>
			</div>
		{/each}
	{:else}
		<div class="px-3 text-center flex flex-col">
			<p>Your do not have any other texts yet.</p>
			<p class="text-sm text-gray-400 mt-3">
				You can add your own texts by clicking on the button below.
			</p>
		</div>
	{/if}
	<div class="absolute bottom-0 h-10 mb-2 w-full flex flex-col gap-y-3 px-2">
		<div class="flex flex-row gap-x-3 items-center justify-center">
			<button
				class="text-sm bg-blue-500 text-white w-full py-2 rounded hover:bg-blue-600"
				on:click={addNewTextButtonClick}
			>
				Add New Text
			</button>
			<button
				class="text-sm bg-blue-500 text-white w-full py-2 rounded hover:bg-blue-600"
				on:click={importTextButtonClick}
			>
				Import Text
			</button>
		</div>
	</div>
</div>

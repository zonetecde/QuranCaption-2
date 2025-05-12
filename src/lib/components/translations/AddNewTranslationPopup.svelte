<script lang="ts">
	import { getVerseTranslation } from '$lib/functions/Translation';
	import { currentProject, getDefaultsTranslationSettings } from '$lib/stores/ProjectStore';
	import { editions } from '$lib/stores/QuranStore';
	import { createEventDispatcher } from 'svelte';
	import toast from 'svelte-french-toast';
	import { fade } from 'svelte/transition';

	let selectedEditionName: string;
	let translationsPreview: {
		surah: number;
		verse: number;
		text: string;
	}[] = [];
	let downloadCompleted = false;
	const dispatch = createEventDispatcher();

	/**
	 * Télécharge la traduction sélectionnée pour chaque verset
	 */
	async function handleTranslationSelected() {
		translationsPreview = [];

		// Download the translations for all the selected verses
		downloadCompleted = false;
		await Promise.all(
			$currentProject.timeline.subtitlesTracks[0].clips.map(async (element) => {
				if (element.verse === -1 || element.surah === -1) return; // Skip if it's not a verse (silence, basmala, etc.

				// Download the translation for the verse
				let translation = await getVerseTranslation(
					selectedEditionName,
					element.surah,
					element.verse
				);

				if (
					translationsPreview.find(
						(translation) =>
							translation.surah === element.surah && translation.verse === element.verse
					)
				)
					return; // Skip if the translation is already in the list

				// Display the translation
				translationsPreview = [
					...translationsPreview,
					{
						surah: element.surah,
						verse: element.verse,
						text: translation
					}
				].sort((a, b) => {
					if (a.surah === b.surah) {
						return a.verse - b.verse;
					}
					return a.surah - b.surah;
				});
			})
		);
		downloadCompleted = true;
	}

	/**
	 * Ajoute la traduction sélectionnée au projet
	 */
	function handleAddTranslation() {
		// Vérfie si la traduction est déjà ajoutée
		if ($currentProject.projectSettings.addedTranslations.includes(selectedEditionName)) {
			toast.error('This translation is already added');
			return;
		}

		$currentProject.projectSettings.addedTranslations = [
			...$currentProject.projectSettings.addedTranslations,
			selectedEditionName
		];

		$currentProject.projectSettings.subtitlesTracksSettings[selectedEditionName] =
			getDefaultsTranslationSettings();

		// Pour chaque verset, ajoute la traduction
		$currentProject.timeline.subtitlesTracks[0].clips.forEach((element) => {
			let translation = translationsPreview.find(
				(translation) => translation.surah === element.surah && translation.verse === element.verse
			);

			if (!translation) return;

			// Vérifie si l'élément a déjà la traduction là
			if (selectedEditionName in element.translations) return;

			element.translations[selectedEditionName] = translation.text;
			element.hadItTranslationEverBeenModified = false; // Reset the flag
		});

		document.getElementById('fetch-translations-button')?.click();

		toast.success('Translation added');
	}
</script>

<div class="absolute inset-0 z-50 backdrop-blur-sm" transition:fade|global>
	<div class="w-full h-full flex items-center justify-center">
		<div
			class="w-[400px] h-[500px] rounded-2xl bg-[#1b1a1a] border-2 border-[#2e2b2b] shadow-black shadow-2xl flex flex-col items-center gap-y-3 p-2 relative"
		>
			{#if $editions}
				<select
					class="w-full bg-transparent border-2 border-slate-500 p-1 rounded-lg outline-none"
					bind:value={selectedEditionName}
					on:change={handleTranslationSelected}
				>
					<option value="" class="bg-slate-300 text-black">Select a translation</option>
					{#each $editions as edition}
						<option value={edition.name} class="bg-slate-300 text-black"
							>{edition.language +
								' - ' +
								edition.author.slice(0, 30) +
								(edition.author.length > 30 ? '...' : '')}</option
						>
					{/each}
				</select>

				<h3>Preview :</h3>

				<div
					class="w-full min-h-[330px] bg-[#2e2b2b] border-2 border-[#2e2b2b] rounded-lg overflow-y-auto flex flex-col"
				>
					{#each translationsPreview as translation}
						<div class="p-2 border-b-2 border-[#2e2b2b] flex items-center gap-x-3">
							<p class="text-white">{translation.surah}:{translation.verse}</p>
							<p class="text-white text-sm w-full">
								{translation.text}
							</p>
						</div>
					{/each}

					{#if translationsPreview.length === 0}
						<p class="text-white text-center my-auto">No selected translations</p>
					{/if}
				</div>

				{#if downloadCompleted}
					<button
						class="bg-[#214627] text-white p-2 rounded-lg hover:bg-[#17311b] duration-100 mt-auto mb-2"
						on:click={handleAddTranslation}
					>
						Add this translation
					</button>
				{/if}
			{/if}

			<button
				class="absolute -top-3 -right-3 border border-[#2e2b2b] bg-slate-500 rounded-full"
				on:click={() => dispatch('close', {})}
			>
				<svg
					xmlns="http://www.w3.org/2000/svg"
					fill="none"
					viewBox="0 0 24 24"
					stroke-width="1.5"
					stroke="currentColor"
					class="size-6"
				>
					<path stroke-linecap="round" stroke-linejoin="round" d="M6 18 18 6M6 6l12 12" />
				</svg>
			</button>
		</div>
	</div>
</div>

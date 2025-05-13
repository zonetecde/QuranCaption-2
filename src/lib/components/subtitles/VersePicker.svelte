<script lang="ts">
	import { addOtherTextsPopupVisibility } from '$lib/stores/LayoutStore';
	import { getNumberOfVersesOfText, OtherTexts } from '$lib/stores/OtherTextsStore';
	import { currentProject } from '$lib/stores/ProjectStore';
	import { getNumberOfVerses, Mushaf } from '$lib/stores/QuranStore';
	import { onMount } from 'svelte';

	export let verseNumberInInput = 1;
	export let verseNumber = 1;
	export let surahNumber = 1;
	export let selectedTextId: number | null = null;

	$: if (
		(verseNumberInInput >= 1 &&
			!selectedTextId &&
			verseNumberInInput <= getNumberOfVerses(surahNumber)) ||
		(selectedTextId && verseNumberInInput <= getNumberOfVersesOfText(selectedTextId))
	) {
		verseNumber = verseNumberInInput;
	}

	onMount(() => {
		// Remets là où on était
		for (let i = $currentProject.timeline.subtitlesTracks[0].clips.length; i >= 0; i--) {
			const element = $currentProject.timeline.subtitlesTracks[0].clips[i];

			if (element && element.verse !== -1 && element.surah > 0) {
				verseNumber = element.verse;
				verseNumberInInput = element.verse;
				surahNumber = element.surah;

				if (element.isLastWordInVerse) {
					// Go to next verse
					if (verseNumberInInput < $Mushaf.surahs[surahNumber - 1].verses.length) {
						verseNumber += 1;
						verseNumberInInput += 1;
					}
				}
				break;
			}
		}
	});

	function onSurahChange(event: any) {
		verseNumber = 1;
		verseNumberInInput = 1;
		surahNumber = parseInt(event.target.value);

		// remove focus for up and down arrow keys
		event.target.blur();
	}

	function textSourceChange(event: any) {
		const selectedValue = event.target.value;

		if (selectedValue === '0') {
			// Reset to Quran
			surahNumber = 1;
			verseNumberInInput = 1;
			verseNumber = 1;
			selectedTextId = null;
			return;
		} else if (selectedValue === '-1') {
			addOtherTextsPopupVisibility.set(true);
			// Set the value to 0
			event.target.value = 0;
			textSourceChange(event);
		} else {
			// Find the selected text by ID
			const selectedText = $OtherTexts.find((text) => text.id === parseInt(selectedValue));

			if (selectedText) {
				selectedTextId = selectedText.id;
				surahNumber = selectedText.id;
				verseNumberInInput = 1;
				verseNumber = 1;
			}
		}
	}
</script>

<section id="navig" class="w-full h-8 flex flex-row mt-1.5 pr-1.5">
	<select
		class="bg-white bg-opacity-15 w-[200px] ml-auto px-2 outline-none"
		on:change={textSourceChange}
	>
		<option class="bg-gray-800" value={0}> Quran </option>
		{#each $OtherTexts as text}
			<option class="bg-gray-800" value={text.id} selected={selectedTextId === text.id}>
				{text.name}
			</option>
		{/each}

		<option class="bg-gray-800" value={-1}>Manage texts</option>
	</select>

	{#if selectedTextId === null}
		<select
			class="bg-white bg-opacity-15 w-[200px] ml-2 ox-2 outline-none"
			on:change={onSurahChange}
		>
			{#each $Mushaf.surahs as surah}
				<option class="bg-gray-800" selected={surah.id === surahNumber} value={surah.id}
					>{surah.id}. {surah.transliteration}</option
				>
			{/each}
		</select>
	{/if}

	<p class="mx-2 mt-1">:</p>
	<input
		type="number"
		class="bg-white bg-opacity-15 w-[65px] px-2 outline-none"
		disabled={surahNumber === 0}
		min="1"
		max={selectedTextId
			? getNumberOfVersesOfText(selectedTextId)
			: $Mushaf.surahs[surahNumber - 1].total_verses}
		bind:value={verseNumberInInput}
	/>
</section>

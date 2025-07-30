<script lang="ts">
	import { Quran, type Verse } from '$lib/classes/Quran';
	import { globalState } from '$lib/runes/main.svelte';

	let subtitlesEditorState = $derived(
		() => globalState.currentProject!.projectEditorState.subtitlesEditor
	);

	function normalizeText(text: string): string {
		return text.toLowerCase().replace("'", '').replace('-', '').replace(' ', '');
	}

	let searchQuery = $state('');
	let isSearchOpen = $state(false);

	// Filtered surahs based on search query - shows all by default
	let filteredSurahs = $derived(() => {
		const query = normalizeText(searchQuery);
		if (!query) return Quran.getSurahsNames();

		return Quran.getSurahsNames().filter(
			(surah) =>
				normalizeText(surah.transliteration).includes(query) ||
				normalizeText(surah.id.toString()).includes(query)
		);
	});

	// Get current surah name for display
	let currentSurahName = $derived(() => {
		const surahId = globalState.currentProject!.projectEditorState.subtitlesEditor.selectedSurah;
		const surah = Quran.getSurahsNames().find((s) => s.id === surahId);
		return surah ? `${surah.id}. ${surah.transliteration}` : 'Select Surah';
	});

	function selectSurah(surahId: number) {
		globalState.currentProject!.projectEditorState.subtitlesEditor.selectedSurah = surahId;
		subtitlesEditorState().selectedVerse = 1;
		subtitlesEditorState().startWordIndex = 0;
		subtitlesEditorState().endWordIndex = 0;
		isSearchOpen = false;
		searchQuery = '';
	}
</script>

<section
	class="w-full flex justify-end gap-3 items-center px-3 bg-secondary border border-color rounded-lg py-2"
>
	<!-- Surah Selector with Search -->
	<div class="flex items-center gap-2 relative">
		<span class="text-sm font-medium text-secondary">Surah:</span>

		{#if !isSearchOpen}
			<button
				class="bg-accent border border-color text-primary rounded-lg px-3 py-2 text-sm font-medium min-w-[200px] text-left
				       hover:border-[var(--accent-primary)] transition-all duration-200 flex items-center justify-between"
				onclick={() => (isSearchOpen = true)}
			>
				<span>{currentSurahName()}</span>
				<span class="material-icons text-sm text-accent">expand_more</span>
			</button>
		{:else}
			<div class="flex items-center gap-2">
				<div class="relative">
					<!-- svelte-ignore a11y_autofocus -->
					<input
						type="text"
						placeholder="Search surah..."
						class="bg-accent border border-color text-primary rounded-lg px-3 py-2 text-sm min-w-[200px]"
						bind:value={searchQuery}
						autofocus
						onkeydown={(e) => {
							if (e.key === 'Escape') {
								isSearchOpen = false;
								searchQuery = '';
							} else if (e.key === 'Enter') {
								if (filteredSurahs().length > 0) {
									selectSurah(filteredSurahs()[0].id);
								}
							}
						}}
					/>
					{#if filteredSurahs().length > 0}
						<div
							class="absolute top-full left-0 mt-1 w-full bg-secondary border border-color rounded-lg shadow-lg max-h-48 overflow-y-auto z-10"
						>
							{#each filteredSurahs() as surah}
								<button
									class="w-full text-left px-3 py-2 text-sm hover:bg-[var(--bg-accent)] transition-colors duration-200 first:rounded-t-lg last:rounded-b-lg cursor-pointer"
									onclick={(e) => {
										selectSurah(surah.id);
									}}
								>
									<span class="text-primary">{surah.id}. {surah.transliteration}</span>
								</button>
							{/each}
						</div>
					{/if}

					<button
						class="absolute right-2 text-accent pt-2 cursor-pointer"
						onclick={() => {
							isSearchOpen = false;
							searchQuery = '';
						}}
					>
						<span class="material-icons text-sm text-accent">close</span>
					</button>
				</div>
			</div>
		{/if}
	</div>

	<!-- Separator -->
	<div class="flex items-center">
		<span class="text-lg font-bold text-accent mx-2">:</span>
	</div>

	<!-- Verse Selector -->
	<div class="flex items-center gap-2">
		<span class="text-sm font-medium text-secondary">Verse:</span>
		<input
			type="number"
			min="1"
			placeholder="1"
			class="bg-accent border border-color text-primary rounded-lg px-3 py-2 text-sm font-medium text-center w-20"
			max={Quran.getVerseCount(subtitlesEditorState().selectedSurah)}
			onchange={() => {
				subtitlesEditorState().startWordIndex = 0;
				subtitlesEditorState().endWordIndex = 0;
			}}
			bind:value={globalState.currentProject!.projectEditorState.subtitlesEditor.selectedVerse}
		/>
	</div>
</section>

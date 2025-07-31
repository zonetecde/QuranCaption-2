<script lang="ts">
	import { SubtitleClip, PredefinedSubtitleClip } from '$lib/classes';
	import { globalState } from '$lib/runes/main.svelte';
	import { fade } from 'svelte/transition';
	import TranslationEdition from './TranslationEdition.svelte';

	function addTranslationButtonClick() {
		// Affiche le pop-up pour ajouter une nouvelle traduction
		setAddTranslationModalVisibility(true);
	}

	let {
		setAddTranslationModalVisibility
	}: {
		setAddTranslationModalVisibility: (visible: boolean) => void;
	} = $props();
	let editionsToEdit = $derived(() =>
		globalState.currentProject!.content.projectTranslation.addedTranslationEditions.filter(
			(edition) => edition.showInTranslationsEditor
		)
	);

	// Fonction pour détecter si le verset a changé par rapport au précédent
	function isNewVerse(currentIndex: number): boolean {
		if (currentIndex === 0) return false;

		const currentSubtitle = globalState.getSubtitleTrack.clips[currentIndex];
		if (!(currentSubtitle.type === 'Subtitle' || currentSubtitle.type === 'Pre-defined Subtitle')) {
			return false;
		}

		// Cherche le sous-titre précédent qui est un verset
		for (let i = currentIndex - 1; i >= 0; i--) {
			const prevSubtitle = globalState.getSubtitleTrack.clips[i];
			if (prevSubtitle.type === 'Subtitle' || prevSubtitle.type === 'Pre-defined Subtitle') {
				// Compare avec SubtitleClip seulement
				if (currentSubtitle instanceof SubtitleClip && prevSubtitle instanceof SubtitleClip) {
					return (
						currentSubtitle.surah !== prevSubtitle.surah ||
						currentSubtitle.verse !== prevSubtitle.verse
					);
				}
				return true; // Changement si l'un n'est pas SubtitleClip
			}
		}

		return false;
	}
</script>

<section class="min-h-0 bg-primary border border-color rounded-lg shadow-lg h-full overflow-y-auto">
	{#if globalState.currentProject!.content.projectTranslation.addedTranslationEditions.length === 0}
		<div class="flex items-center flex-col gap-6 justify-center h-full pb-10">
			<div class="flex flex-col items-center gap-4">
				<div class="w-16 h-16 bg-accent rounded-full flex items-center justify-center">
					<span class="material-icons text-accent text-2xl">translate</span>
				</div>
				<div class="text-center">
					<h3 class="text-primary text-lg font-semibold mb-2">No Translations Yet</h3>
					<p class="text-thirdly text-sm max-w-md">
						Start by adding translation editions to begin working on your translations.
					</p>
				</div>
			</div>
			<button
				class="btn-accent px-6 py-3 text-sm font-semibold rounded-lg flex items-center gap-2 hover:shadow-lg transition-all duration-200"
				onclick={addTranslationButtonClick}
			>
				<span class="material-icons text-base">add</span>
				Add Translation
			</button>
		</div>
	{:else}
		<div class="flex p-4 flex-col bg-secondary gap-y-3">
			{#each globalState.getSubtitleTrack.clips as subtitle, i}
				<!-- Divider pour les nouveaux versets -->
				{#if isNewVerse(i)}
					<div class="w-full h-0.5 bg-[var(--accent-primary)]/40 my-2"></div>
				{/if}

				<!-- Affiche le texte arabe -->
				{#if subtitle.type === 'Subtitle' || subtitle.type === 'Pre-defined Subtitle'}
					<section class="border border-color rounded px-4 py-4 text-primary">
						{#if subtitle instanceof SubtitleClip}
							<p class="text-3xl arabic text-right" dir="rtl">
								{subtitle.getTextWithVerseNumber()}
							</p>

							<p class="text-sm text-thirdly text-left mt-1" dir="rtl">
								{subtitle.wbwTranslation}
							</p>
						{:else if subtitle instanceof PredefinedSubtitleClip}
							<p class="text-3xl arabic text-right" dir="rtl">{subtitle.text}</p>
						{/if}

						{#each editionsToEdit() as edition, j}
							<TranslationEdition
								{edition}
								bind:subtitle={globalState.getSubtitleTrack.clips[i] as SubtitleClip}
								previousSubtitle={i > 0
									? (globalState.getSubtitleTrack.clips[i - 1] as SubtitleClip)
									: undefined}
							/>
						{/each}
					</section>
				{/if}
			{/each}
		</div>
	{/if}
</section>

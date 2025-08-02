<script lang="ts">
	import { SubtitleClip, PredefinedSubtitleClip } from '$lib/classes';
	import { globalState } from '$lib/runes/main.svelte';
	import { fade } from 'svelte/transition';
	import TranslationEdition from './TranslationEdition.svelte';
	import { onMount, untrack } from 'svelte';
	import type { ClipWithTranslation } from '$lib/classes/Clip.svelte';
	import NoTranslationsToShow from './NoTranslationsToShow.svelte';

	function addTranslationButtonClick() {
		// Affiche le pop-up pour ajouter une nouvelle traduction
		setAddTranslationModalVisibility(true);
	}

	let {
		setAddTranslationModalVisibility
	}: {
		setAddTranslationModalVisibility: (visible: boolean) => void;
	} = $props();

	let editionsToShowInEditor = $derived(() =>
		globalState.currentProject!.content.projectTranslation.addedTranslationEditions.filter(
			(edition) => edition.showInTranslationsEditor
		)
	);

	// Le format est : { [sous-titreId]: [edition1, edition2, ...] }
	let allowedTranslations: { [key: string]: string[] } = $state({});

	$effect(() => {
		// Permet de trigger la réactivité en forçant la lecture des status
		for (const key in globalState.getTranslationsState.filters) {
			const value = globalState.getTranslationsState.filters[key];
			const _ = value;
		}

		// Aussi lorsqu'on ajoute/supprime une édition de traduction
		for (const edition of globalState.currentProject!.content.projectTranslation
			.addedTranslationEditions) {
			const _ = edition.name;
		}

		// Met à jour les traductions à afficher en fonction des filtres
		const filter = globalState.getTranslationsState.filters;

		untrack(() => {
			for (const subtitle of globalState.getSubtitleTrack.clips) {
				if (subtitle.type === 'Subtitle' || subtitle.type === 'Pre-defined Subtitle') {
					const subtitleId = subtitle.id;

					// Regarde ses traductions
					const translations = (subtitle as ClipWithTranslation).translations;
					let authorizedEditions: string[] = [];

					if (translations) {
						// Regarde s'il a des traductions correspondant au filtre
						for (const key in translations) {
							const translation = translations[key];

							// Si son statut est dans le filtre
							if (filter[translation.status]) {
								// Si on autorise son affichage dans l'éditeur
								if (editionsToShowInEditor().some((edition) => edition.name === key)) {
									// On ajoute l'édition à la liste des traductions autorisées
									authorizedEditions.push(key);
								}
							}
						}
					}

					if (authorizedEditions.length > 0) {
						allowedTranslations[subtitleId] = authorizedEditions;
					} else {
						// Si aucune traduction n'est autorisée, on supprime l'entrée
						delete allowedTranslations[subtitleId];
					}
				}
			}
		});
	});

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

	onMount(() => {
		// Le timeout sert à attendre que le DOM soit complètement chargé (donc que les traductions soient affichées)
		setTimeout(() => {
			// Remet la position du scroll à la dernière position sauvegardée
			const savedScrollPosition = globalState.getTranslationsState.scrollPosition;
			const workspace = document.getElementById('translations-workspace');
			if (workspace) {
				workspace.scrollTop = savedScrollPosition;
			}
		}, 0);
	});
</script>

<section
	class="min-h-0 bg-secondary border border-color rounded-lg shadow-lg h-full overflow-y-auto"
	id="translations-workspace"
	onscroll={(e) => {
		// Sauvegarde la position du scroll
		const pos = (e.target as HTMLElement).scrollTop;
		globalState.getTranslationsState.scrollPosition = pos;
	}}
>
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
		<div class="flex p-4 flex-col bg-secondary gap-y-3 h-full">
			{#if Object.keys(allowedTranslations).length === 0}
				<NoTranslationsToShow />
			{:else}
				{#each globalState.getSubtitleTrack.clips as subtitle, i}
					{#if allowedTranslations[subtitle.id]}
						<!-- Divider pour les nouveaux versets (sauf pour le premier élément) -->
						{#if isNewVerse(i) && i > 0 && globalState.getSubtitleTrack.clips
								.slice(0, i)
								.some((clip, index) => allowedTranslations[clip.id])}
							<div class="w-full min-h-0.5 bg-[var(--accent-primary)]/40 my-2"></div>
						{/if}

						<!-- Affiche le texte arabe -->
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

							{#each editionsToShowInEditor() as edition, j}
								{#if allowedTranslations[subtitle.id].includes(edition.name)}
									<TranslationEdition
										{edition}
										bind:subtitle={globalState.getSubtitleTrack.clips[i] as SubtitleClip}
										previousSubtitle={i > 0
											? (globalState.getSubtitleTrack.getSubtitleBefore(i) as SubtitleClip)
											: undefined}
									/>
								{/if}
							{/each}
						</section>
					{/if}
				{/each}
			{/if}
		</div>
	{/if}
</section>

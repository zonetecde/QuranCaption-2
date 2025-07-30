<script lang="ts">
	import { Edition, Project, ProjectContent, ProjectDetail, TrackType } from '$lib/classes';
	import Section from '$lib/components/projectEditor/Section.svelte';
	import SubtitleClip from '$lib/components/projectEditor/timeline/track/SubtitleClip.svelte';
	import { globalState } from '$lib/runes/main.svelte';
	import { projectService } from '$lib/services/ProjectService';
	import { onMount } from 'svelte';
	import toast from 'svelte-5-french-toast';

	let { close } = $props();

	let selectedLanguage: string | null = $state(null);
	let selectedTranslation: Edition | null = $state(null);
	let searchQuery: string = $state('');
	let translationPreview: Record<string, string> = $state({});
	let isLoadingPreview = $state(false);

	// Computed filtered translations based on search
	const filteredTranslations = $derived(() => {
		if (!searchQuery) return globalState.availableTranslations;

		const filtered: any = {};
		const query = searchQuery.toLowerCase();

		for (const [language, data] of Object.entries(globalState.availableTranslations)) {
			if (language.toLowerCase().includes(query)) {
				filtered[language] = data;
			} else {
				const matchingTranslations = data.translations.filter((t: any) =>
					t.author.toLowerCase().includes(query)
				);

				if (matchingTranslations.length > 0) {
					filtered[language] = {
						...data,
						translations: matchingTranslations
					};
				}
			}
		}

		return filtered;
	});

	async function addTranslationButtonClick() {
		if (selectedTranslation) {
			// Ajoute la traduction au projet
			globalState.currentProject?.content.projectTranslation.addTranslation(
				selectedTranslation,
				translationPreview
			);

			close();
		}
	}

	$effect(() => {
		if (selectedTranslation) {
			// Récupère toutes les traductions des versets du projet avec cette traduction
			isLoadingPreview = true;
			globalState
				.currentProject!.content.projectTranslation.getAllProjectSubtitlesTranslations(
					selectedTranslation
				)
				.then((translations) => {
					translationPreview = translations;
					isLoadingPreview = false;
				})
				.catch(() => {
					translationPreview = {};
					isLoadingPreview = false;
				});
		} else {
			translationPreview = {};
			isLoadingPreview = false;
		}
	});
</script>

<div
	class="bg-secondary border-color border rounded-2xl w-[800px] h-[700px] shadow-2xl shadow-black flex flex-col relative overflow-hidden"
>
	<!-- Header with gradient background -->
	<div class="bg-gradient-to-r from-accent to-bg-accent px-6 py-4 border-b border-color">
		<div class="flex items-center justify-between">
			<div class="flex items-center gap-3">
				<div class="w-8 h-8 bg-accent-primary rounded-full flex items-center justify-center">
					<span class="material-icons text-black text-lg">translate</span>
				</div>
				<div>
					<h2 class="text-xl font-bold text-primary">Add Translation</h2>
					<p class="text-sm text-thirdly">
						Choose a language and translation to add to your project
					</p>
				</div>
			</div>

			<!-- Close button -->
			<button
				class="w-8 h-8 rounded-full hover:bg-[rgba(255,255,255,0.1)] flex items-center justify-center transition-all duration-200 text-secondary hover:text-primary"
				onclick={close}
			>
				<span class="material-icons text-lg">close</span>
			</button>
		</div>
	</div>
	<!-- Search bar -->
	<div class="px-6 py-4 border-b border-color bg-primary">
		<div class="relative">
			<input
				type="text"
				placeholder="Search languages or authors..."
				bind:value={searchQuery}
				class="w-full pr-4 py-3 bg-secondary border border-color rounded-xl text-primary focus:border-accent-primary focus:outline-none focus:ring-2 focus:ring-accent-primary focus:ring-opacity-20 transition-all duration-200"
				style="padding-left: 40px; "
			/>

			<span class="material-icons absolute left-3 top-1/2 transform -translate-y-1/2 text-thirdly"
				>search</span
			>
		</div>
	</div>
	<!-- Content area -->
	<div class="flex-1 overflow-hidden">
		{#if selectedTranslation}
			<!-- Two column layout: Selection + Preview -->
			<div class="h-full flex">
				<!-- Left column: Selection -->
				<div class="w-1/2 border-r border-color overflow-y-auto px-6 py-4">
					<div class="mb-4">
						<h3 class="text-lg font-semibold text-primary mb-2">Available Translations</h3>
						<p class="text-sm text-thirdly">
							Choose a different translation or continue with selected one
						</p>
					</div>

					<div class="space-y-4">
						{#each Object.keys(filteredTranslations()) as language}
							{@const translationFlag = filteredTranslations()[language].flag}
							{@const translations = filteredTranslations()[language].translations}

							<!-- Language section -->
							<div class="bg-accent border border-color rounded-lg overflow-hidden">
								<!-- Language header -->
								<div
									class="flex items-center gap-3 p-3 bg-gradient-to-r from-bg-secondary to-bg-accent border-b border-color"
								>
									<img src={translationFlag} alt={language} class="w-6 h-6 shadow-lg" />
									<div>
										<h4 class="font-semibold text-primary">{language}</h4>
										<p class="text-xs text-thirdly">{translations.length} available</p>
									</div>
								</div>

								<!-- Translations -->
								<div class="p-3 space-y-2">
									{#each translations as translationDetail}
										<button
											class="w-full p-3 bg-secondary border border-color rounded-lg hover:border-accent-primary transition-all duration-200 text-left {selectedTranslation ===
											translationDetail
												? 'border-accent-primary bg-[rgba(88,166,255,0.1)]'
												: ''}"
											onclick={() => {
												if (selectedTranslation === translationDetail) {
													selectedTranslation = null;
													selectedLanguage = null;
													return;
												}
												selectedLanguage = language;
												selectedTranslation = translationDetail;
											}}
										>
											<div class="flex items-center justify-between">
												<div class="flex items-center gap-2">
													{#if translationDetail.comments === 'Ponctuation' || translationDetail.comments === 'Saheeh International'}
														<span class="material-icons text-yellow-200 text-sm">star</span>
													{/if}
													<span class="font-medium text-primary text-sm"
														>{translationDetail.author}</span
													>
												</div>
												{#if selectedTranslation === translationDetail}
													<span class="material-icons text-accent-primary text-sm"
														>check_circle</span
													>
												{/if}
											</div>
										</button>
									{/each}
								</div>
							</div>
						{/each}
					</div>
				</div>

				<!-- Right column: Preview -->
				<div class="w-1/2 overflow-y-auto px-6 py-4">
					<div class="mb-4">
						<h3 class="text-lg font-semibold text-primary mb-2">Translation Preview</h3>
						<p class="text-sm text-thirdly">
							Preview of "{selectedTranslation.author}" for your project verses
						</p>
					</div>

					{#if isLoadingPreview}
						<!-- Loading state -->
						<div class="flex items-center justify-center py-12">
							<div class="text-center">
								<div
									class="w-8 h-8 border-2 border-accent-primary border-t-transparent rounded-full animate-spin mx-auto mb-3"
								></div>
								<p class="text-sm text-thirdly">Loading translation preview...</p>
							</div>
						</div>
					{:else if Object.keys(translationPreview).length === 0}
						<!-- Empty state -->
						<div class="flex items-center justify-center py-12">
							<div class="text-center">
								<div
									class="w-12 h-12 bg-accent rounded-full flex items-center justify-center mb-3 mx-auto"
								>
									<span class="material-icons text-thirdly">translate</span>
								</div>
								<p class="text-sm text-thirdly">No verses found in your project</p>
							</div>
						</div>
					{:else}
						<!-- Translation preview -->
						<div class="space-y-3">
							{#each Object.entries(translationPreview) as [verseKey, translation]}
								{@const [surah, verse] =
									verseKey.split(':').length === 2 ? verseKey.split(':') : [null, null]}
								<div
									class="bg-secondary border border-color rounded-lg p-4 hover:border-accent-primary transition-all duration-200"
								>
									<!-- Verse reference -->
									<div class="flex items-center gap-2 mb-2">
										<span
											class="bg-accent-primary text-black px-2 py-1 rounded-md text-xs font-semibold"
										>
											{verseKey}
										</span>
										{#if surah && verse}
											<span class="text-xs text-thirdly">Surah {surah}, Verse {verse}</span>
										{/if}
									</div>

									<!-- Translation text -->
									<p class="text-sm text-primary leading-relaxed">{translation}</p>
								</div>
							{/each}
						</div>
					{/if}
				</div>
			</div>
		{:else}
			<!-- Original single column layout when no translation selected -->
			<div class="h-full overflow-y-auto px-6 py-4 space-y-4">
				{#if Object.keys(filteredTranslations()).length === 0}
					<!-- Empty state -->
					<div class="flex flex-col items-center justify-center h-full text-center">
						<div class="w-16 h-16 bg-accent rounded-full flex items-center justify-center mb-4">
							<span class="material-icons text-thirdly text-2xl">search_off</span>
						</div>
						<h3 class="text-lg font-semibold text-primary mb-2">No translations found</h3>
						<p class="text-thirdly max-w-md">
							{#if searchQuery}
								No translations match your search "{searchQuery}". Try a different search term.
							{:else}
								No translations are currently available.
							{/if}
						</p>
						{#if searchQuery}
							<button class="btn mt-4 px-4 py-2" onclick={() => (searchQuery = '')}>
								Clear search
							</button>
						{/if}
					</div>
				{:else}
					{#each Object.keys(filteredTranslations()) as language}
						{@const translationFlag = filteredTranslations()[language].flag}
						{@const translations = filteredTranslations()[language].translations}

						<!-- Language section -->
						<div class="bg-accent border border-color rounded-xl overflow-hidden">
							<!-- Language header -->
							<div
								class="flex items-center gap-3 p-4 bg-gradient-to-r from-bg-secondary to-bg-accent border-b border-color"
							>
								<div class="relative">
									<img src={translationFlag} alt={language} class="w-8 h-8 shadow-lg" />
								</div>
								<div>
									<h3 class="font-bold text-lg text-primary">{language}</h3>
									<p class="text-sm text-thirdly">
										{translations.length} translation{translations.length > 1 ? 's' : ''} available
									</p>
								</div>
							</div>

							<!-- Translations grid -->
							<div class="p-4">
								<div class="grid grid-cols-1 md:grid-cols-2 gap-3">
									{#each translations as translationDetail}
										<button
											class="group relative p-4 bg-secondary border border-color rounded-lg hover:border-accent-primary hover:bg-[rgba(88,166,255,0.05)] transition-all duration-200 text-left cursor-pointer"
											onclick={() => {
												selectedLanguage = language;
												selectedTranslation = translationDetail;
											}}
										>
											<!-- Selection indicator -->
											<div
												class="absolute top-2 right-2 w-5 h-5 rounded-full border-2 border-accent-primary group-hover:bg-accent-primary transition-all duration-200 flex items-center justify-center"
											></div>

											<!-- Content -->
											<div class="pr-8 cursor-pointer">
												<h4
													class="font-semibold text-primary group-hover:text-accent-primary transition-colors duration-200 flex items-center"
												>
													{#if translationDetail.comments === 'Ponctuation' || translationDetail.comments === 'Saheeh International'}
														<!-- star icon -->
														<span class="material-icons text-yellow-200 text-xs mr-1">star</span>
													{/if}
													{translationDetail.author}
												</h4>
											</div>

											<!-- Hover effect -->
											<div
												class="absolute inset-0 rounded-lg bg-gradient-to-r from-transparent to-accent-primary opacity-0 group-hover:opacity-5 transition-opacity duration-200 cursor-pointer"
											></div>
										</button>
									{/each}
								</div>
							</div>
						</div>
					{/each}
				{/if}
			</div>
		{/if}
	</div>

	<!-- Footer with action buttons -->
	<div class="border-t border-color bg-primary px-6 py-4">
		<div class="flex items-center justify-between">
			<div class="flex items-center gap-2 text-sm text-thirdly">
				{#if selectedTranslation}
					<span class="material-icons text-accent-secondary">check_circle</span>
					<span
						>Selected: <strong class="text-accent-primary">{selectedTranslation.author}</strong>
						({selectedLanguage})</span
					>
				{:else}
					<span class="material-icons">info</span>
					<span>Please select a translation to continue</span>
				{/if}
			</div>

			<div class="flex gap-3">
				<button class="btn px-6 py-2.5 font-medium" onclick={close}> Cancel </button>
				<button
					class="btn-accent px-6 py-2.5 font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
					onclick={addTranslationButtonClick}
					disabled={!selectedTranslation}
				>
					<span class="material-icons text-lg">add</span>
					Add Translation
				</button>
			</div>
		</div>
	</div>
</div>

<style>
	/* Custom scrollbar */
	.overflow-y-auto::-webkit-scrollbar {
		width: 8px;
	}

	.overflow-y-auto::-webkit-scrollbar-track {
		background: var(--bg-secondary);
		border-radius: 4px;
	}

	.overflow-y-auto::-webkit-scrollbar-thumb {
		background: var(--timeline-scrollbar);
		border-radius: 4px;
		transition: background 0.2s ease;
	}

	.overflow-y-auto::-webkit-scrollbar-thumb:hover {
		background: var(--timeline-scrollbar-hover);
	}

	/* Smooth animations */
	@keyframes slideInUp {
		from {
			opacity: 0;
			transform: translateY(20px);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}

	.bg-secondary {
		animation: slideInUp 0.3s ease-out;
	}

	/* Enhanced gradient backgrounds */
	.bg-gradient-to-r.from-accent.to-bg-accent {
		background: linear-gradient(135deg, var(--bg-accent) 0%, var(--bg-secondary) 100%);
	}

	.bg-gradient-to-r.from-bg-secondary.to-bg-accent {
		background: linear-gradient(90deg, var(--bg-secondary) 0%, var(--bg-accent) 100%);
	}

	/* Enhanced hover effects */
	button:hover {
		transform: translateY(-1px);
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
	}

	.btn-accent:hover {
		box-shadow: 0 4px 16px rgba(88, 166, 255, 0.3);
	}

	/* Flag image enhancements */
	img[alt] {
		object-fit: cover;
		transition: transform 0.2s ease;
	}

	img[alt]:hover {
		transform: scale(1.1);
	}

	/* Selection indicator animation */
	.group:hover .absolute.top-2.right-2 {
		animation: pulse 2s infinite;
	}

	@keyframes pulse {
		0%,
		100% {
			opacity: 1;
		}
		50% {
			opacity: 0.7;
		}
	}

	/* Enhanced focus states */
	input:focus {
		transform: translateY(-1px);
		box-shadow: 0 4px 12px rgba(88, 166, 255, 0.2);
	}

	/* Better disabled state */
	button:disabled {
		transform: none !important;
		box-shadow: none !important;
	}
</style>

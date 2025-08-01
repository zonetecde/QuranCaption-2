<script lang="ts">
	import type { Edition, SubtitleClip } from '$lib/classes';
	import ClickableLink from '$lib/components/home/ClickableLink.svelte';
	import ModalManager from '$lib/components/modals/ModalManager';
	import { globalState } from '$lib/runes/main.svelte';
	import { onMount } from 'svelte';
	import toast from 'svelte-5-french-toast';
	import { slide } from 'svelte/transition';

	let {
		close,
		edition
	}: {
		close: () => void;
		edition: Edition;
	} = $props();

	let aiPrompt: string = $state('');
	let aiResponse: string = $state('');
	// Fonction pour traiter la réponse de l'IA et mettre à jour les traductions
	function setTranslationsFromAIResponse(aiResponseStr: string): void {
		try {
			aiResponseStr = aiResponseStr.replace('```json', '');
			aiResponseStr = aiResponseStr.replace('```', '');

			const aiResponse = JSON.parse(aiResponseStr);

			// Error tracking
			const errorMessages: string[] = [];
			let processedVerses = 0;
			let successfulVerses = 0;

			// Récupère les données indexées pour mapper les réponses aux sous-titres
			const indexToSubtitleMapping: {
				[key: number]: { subtitles: any[]; verseKey: string; translation: any[] };
			} = {};

			let index = 0;
			let verses: { [key: string]: SubtitleClip[] } = {};

			// Collecte les sous-titres par verset
			for (let i: number = 0; i < globalState.getSubtitleClips.length; i++) {
				const subtitle = globalState.getSubtitleClips[i];
				const verseKey = subtitle.getVerseKey();

				if (subtitle.isFullVerse) continue; // If complete verse, translation is done by default

				if (verses[verseKey] === undefined) {
					verses[verseKey] = [];
				}

				verses[verseKey].push(subtitle);
			}

			// Si tout les sous-titres d'un même verset on un status qui montre que c'est déjà traduit, on ne les traite pas
			for (const verseKey in verses) {
				const subtitlesForVerse = verses[verseKey];

				if (
					subtitlesForVerse.every((subtitle) =>
						subtitle.translations[edition.name]?.isStatusComplete()
					)
				) {
					delete verses[verseKey]; // Supprime le verset s'il est déjà traduit
				}
			}

			// Construit le mapping index -> sous-titres
			for (const verseKey in verses) {
				const subtitlesForVerse = verses[verseKey];
				const translation = globalState.getProjectTranslation.getVerseTranslation(
					edition,
					verseKey
				);

				let translationWords = [];
				for (let i = 0; i < translation.split(' ').length; i++) {
					const element = translation.split(' ')[i];
					translationWords.push({
						i: i,
						w: element
					});
				}

				if (subtitlesForVerse.length > 0) {
					indexToSubtitleMapping[index] = {
						subtitles: subtitlesForVerse,
						verseKey: verseKey,
						translation: translationWords
					};
					index++;
				}
			}

			// Traite chaque réponse de l'IA
			for (const indexStr in aiResponse) {
				const indexNum = parseInt(indexStr);
				const segmentRanges = aiResponse[indexStr];

				if (!indexToSubtitleMapping[indexNum]) {
					errorMessages.push(`Index ${indexNum}: No corresponding verse found in project`);
					continue;
				}

				if (!Array.isArray(segmentRanges)) {
					errorMessages.push(
						`Index ${indexNum} (${indexToSubtitleMapping[indexNum].verseKey}): Invalid response format - expected array`
					);
					continue;
				}

				const mappingData = indexToSubtitleMapping[indexNum];
				const subtitlesForVerse = mappingData.subtitles;
				const translationWords = mappingData.translation;
				const verseKey = mappingData.verseKey;

				processedVerses++;

				// Check if number of segments matches number of subtitles
				if (segmentRanges.length !== subtitlesForVerse.length) {
					errorMessages.push(
						`Verse ${verseKey}: Mismatch between AI segments (${segmentRanges.length}) and actual subtitles (${subtitlesForVerse.length})`
					);
					continue;
				}

				let verseHasError = false;

				// Applique chaque range à son sous-titre correspondant
				for (let segmentIndex = 0; segmentIndex < segmentRanges.length; segmentIndex++) {
					const range = segmentRanges[segmentIndex];
					const subtitle = subtitlesForVerse[segmentIndex];
					const verseTranslation = subtitle.translations[edition.name];

					if (range === null) {
						errorMessages.push(
							`Verse ${verseKey}, segment ${segmentIndex + 1}: AI returned null (unmappable segment)`
						);
						verseTranslation.status = 'ai error';
						verseHasError = true;
						continue;
					}

					if (!Array.isArray(range) || range.length !== 2) {
						errorMessages.push(
							`Verse ${verseKey}, segment ${segmentIndex + 1}: Invalid range format - expected [start, end]`
						);
						verseTranslation.status = 'ai error';
						verseHasError = true;
						continue;
					}

					const [startIndex, endIndex] = range;

					// Validate indices
					if (startIndex < 0 || endIndex < 0) {
						errorMessages.push(
							`Verse ${verseKey}, segment ${segmentIndex + 1}: Negative indices not allowed (${startIndex}, ${endIndex})`
						);
						verseTranslation.status = 'ai error';
						verseHasError = true;
						continue;
					}

					if (startIndex > endIndex) {
						errorMessages.push(
							`Verse ${verseKey}, segment ${segmentIndex + 1}: Start index (${startIndex}) cannot be greater than end index (${endIndex})`
						);
						verseTranslation.status = 'ai error';
						verseHasError = true;
						continue;
					}

					if (startIndex >= translationWords.length || endIndex >= translationWords.length) {
						errorMessages.push(
							`Verse ${verseKey}, segment ${segmentIndex + 1}: Indices out of range (${startIndex}-${endIndex}), translation has only ${translationWords.length} words`
						);

						verseTranslation.status = 'ai error';
						verseHasError = true;
						continue;
					}

					// Extrait le texte de traduction correspondant aux indices
					const translationText = translationWords
						.slice(startIndex, endIndex + 1)
						.map((word) => word.w)
						.join(' ');

					// Met à jour la traduction du sous-titre
					verseTranslation.text = translationText;
					verseTranslation.startWordIndex = startIndex;
					verseTranslation.endWordIndex = endIndex;
					verseTranslation.status = 'ai trimmed';
				}

				if (!verseHasError) {
					successfulVerses++;
				}
			}

			// Display processing summary
			let summaryMessage = `Processing complete: ${successfulVerses}/${processedVerses} verses successfully processed`;

			if (errorMessages.length > 0) {
				summaryMessage += `\n\nErrors encountered:\n${errorMessages.join('\n')}`;
				console.warn('Translation processing errors:', errorMessages);
			}

			if (errorMessages.length > 0) {
				ModalManager.errorModal(
					'AI Translation Errors',
					`Errors detected in ${errorMessages.length} verse${errorMessages.length > 1 ? 's' : ''}. You can either try again with a new AI response or manually fix the affected subtitles.`,
					summaryMessage
				);
			} else {
				toast.success(summaryMessage);
			}

			if (successfulVerses > 0) {
				close(); // Close modal only if at least some translations were successful
			}
		} catch (error: any) {
			ModalManager.errorModal(
				'Error processing AI response',
				'An error occurred while processing the AI response.',
				error.message
			);
		}
	}

	onMount(async () => {
		// Génère déjà le prompt
		const array = [];

		let index = 0;

		let verses: { [key: string]: SubtitleClip[] } = {};

		for (let i: number = 0; i < globalState.getSubtitleClips.length; i++) {
			const subtitle = globalState.getSubtitleClips[i];

			const verseKey = subtitle.getVerseKey();

			if (verses[verseKey] === undefined) {
				if (subtitle.isFullVerse) continue; // Si verset complet la traduction est faite par défaut

				verses[verseKey] = [];
			}

			verses[verseKey].push(subtitle);
		}

		// Si tout les sous-titres d'un même verset on un status qui montre que c'est déjà traduit, on ne les traite pas
		for (const verseKey in verses) {
			const subtitlesForVerse = verses[verseKey];

			if (
				subtitlesForVerse.every((subtitle) =>
					subtitle.translations[edition.name]?.isStatusComplete()
				)
			) {
				delete verses[verseKey]; // Supprime le verset s'il est déjà traduit			}
			}

			// Vérifier s'il reste des versets à traiter
			if (Object.keys(verses).length === 0) {
				aiPrompt =
					'All verses have already been translated for this edition. No AI assistance needed.';
				return;
			}

			for (const verseKey in verses) {
				const verse = verses[verseKey];
				const translation = globalState.getProjectTranslation.getVerseTranslation(
					edition,
					verseKey
				);

				let translationWords = [];

				for (let i = 0; i < translation.split(' ').length; i++) {
					const element = translation.split(' ')[i];
					translationWords.push({
						i: i,
						w: element
					});
				}

				if (verse.length > 0) {
					array.push({
						index: index++,
						verseKey: verseKey,
						segments: verse,
						translation: translationWords
					});
				}
			}

			const json = JSON.stringify(array);
			let prompt = await (await fetch('/prompts/translation.txt')).text();

			aiPrompt = prompt + '\n\n' + json;
		}
	});
</script>

<div
	class="bg-secondary border-color border rounded-2xl w-[900px] h-[700px] shadow-2xl shadow-black flex flex-col relative overflow-hidden"
	transition:slide
>
	<!-- Header with gradient background -->
	<div class="bg-gradient-to-r from-accent to-bg-accent px-6 py-4 border-b border-color">
		<div class="flex items-center justify-between">
			<div class="flex items-center gap-3">
				<div class="w-10 h-10 bg-accent-primary rounded-full flex items-center justify-center">
					<span class="material-icons text-black text-xl">psychology</span>
				</div>
				<div>
					<h2 class="text-xl font-bold text-primary">AI Translation Assistant</h2>
					<p class="text-sm text-thirdly">
						Generate translations for <strong class="text-accent">{edition.author}</strong> edition
					</p>
				</div>
			</div>

			<!-- Close button -->
			<button
				class="w-8 h-8 rounded-full hover:bg-[rgba(255,255,255,0.1)] flex items-center justify-center transition-all duration-200 text-secondary hover:text-primary cursor-pointer"
				onclick={close}
			>
				<span class="material-icons text-lg">close</span>
			</button>
		</div>
	</div>

	<!-- Instructions section -->
	<div class="px-6 py-4 border-b border-color bg-primary">
		<div class="bg-accent border border-color rounded-lg p-4">
			<div class="flex items-start gap-3">
				<div
					class="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
				>
					<span class="material-icons text-white text-sm">info</span>
				</div>
				<div class="flex-1">
					<h3 class="text-sm font-semibold text-primary mb-2">How to use AI Translation</h3>
					<div class="space-y-2 text-sm text-secondary">
						<p>
							1. Copy the generated prompt below and paste it in
							<span class="text-accent font-medium">
								<ClickableLink url="https://gemini.google.com/" label="Gemini" />
							</span>
						</p>
						<p>2. Wait for the AI to generate the JSON response</p>
						<p>3. Copy the JSON response and paste it in the response field</p>
						<p>4. Click "Apply Translations" to update your subtitles</p>
					</div>
				</div>
			</div>
		</div>
	</div>
	<!-- Content area -->
	<div class="flex-1 overflow-hidden flex flex-col">
		<div class="flex-1 overflow-y-auto px-6 py-4 space-y-6">
			{#if aiPrompt === 'All verses have already been translated for this edition. No AI assistance needed.'}
				<!-- All verses translated message -->
				<div class="flex flex-col items-center justify-center h-full text-center">
					<div class="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mb-4">
						<span class="material-icons text-green-500 text-2xl">check_circle</span>
					</div>
					<h3 class="text-xl font-semibold text-primary mb-2">All Done!</h3>
					<p class="text-thirdly text-lg mb-2">
						All verses have already been translated for the <strong class="text-accent"
							>{edition.author}</strong
						> edition.
					</p>
					<p class="text-sm text-secondary">No AI assistance needed at this time.</p>
				</div>
			{:else}
				<!-- Normal AI workflow -->
				<!-- Prompt section -->
				<div class="space-y-3">
					<div class="flex items-center gap-2">
						<span class="material-icons text-accent-primary text-lg">code</span>
						<h3 class="text-lg font-semibold text-primary">AI Prompt</h3>
						<span class="bg-accent-primary text-black px-2 py-1 rounded-md text-xs font-semibold"
							>Step 1</span
						>
					</div>
					<div class="bg-accent border border-color rounded-lg p-4">
						<div class="flex items-center justify-between mb-3">
							<label for="ai-prompt" class="text-sm font-medium text-secondary"
								>Generated prompt for AI:</label
							>
							<button
								class="btn-accent px-4 py-2 text-sm font-medium rounded-lg flex items-center gap-2 hover:shadow-lg transition-all duration-200"
								onclick={() => {
									navigator.clipboard.writeText(aiPrompt);
									toast.success('Prompt copied to clipboard!');
								}}
								disabled={!aiPrompt}
							>
								<span class="material-icons text-base">content_copy</span>
								Copy Prompt
							</button>
						</div>

						<textarea
							id="ai-prompt"
							readonly
							bind:value={aiPrompt}
							class="w-full h-40 bg-secondary border border-color rounded-lg p-3 text-sm text-primary resize-none font-mono leading-relaxed"
							placeholder="Generating prompt..."
						></textarea>
					</div>
				</div>

				<!-- Response section -->
				<div class="space-y-3">
					<div class="flex items-center gap-2">
						<span class="material-icons text-accent-secondary text-lg">smart_toy</span>
						<h3 class="text-lg font-semibold text-primary">AI Response</h3>
						<span class="bg-accent-secondary text-black px-2 py-1 rounded-md text-xs font-semibold"
							>Step 2</span
						>
					</div>
					<div class="bg-accent border border-color rounded-lg p-4">
						<div class="flex items-center justify-between mb-3">
							<label for="ai-response" class="text-sm font-medium text-secondary"
								>Paste the JSON response from AI:</label
							>
							<button
								class="btn-accent px-4 py-2 text-sm font-medium rounded-lg flex items-center gap-2 hover:shadow-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
								onclick={() => setTranslationsFromAIResponse(aiResponse)}
								disabled={!aiResponse.trim()}
							>
								<span class="material-icons text-base">auto_fix_high</span>
								Apply Translations
							</button>
						</div>

						<textarea
							id="ai-response"
							bind:value={aiResponse}
							class="w-full h-40 bg-secondary border border-color rounded-lg p-3 text-sm text-primary resize-none font-mono leading-relaxed focus:border-accent-primary focus:outline-none focus:ring-2 focus:ring-accent-primary focus:ring-opacity-20 transition-all duration-200"
							placeholder="Paste the JSON response from Gemini here..."
						></textarea>

						{#if aiResponse.trim()}
							<div class="mt-3 p-3 bg-secondary border border-color rounded-lg">
								<div class="flex items-center gap-2">
									<span class="material-icons text-accent-secondary text-sm">check_circle</span>
									<span class="text-sm text-accent-secondary font-medium">Response detected</span>
								</div>
								<p class="text-xs text-thirdly mt-1">
									Ready to apply translations to your subtitles
								</p>
							</div>
						{/if}
					</div>
				</div>
			{/if}
		</div>
	</div>

	<!-- Footer -->
	<div class="border-t border-color bg-primary px-6 py-4">
		<div class="flex items-center justify-between">
			<div class="flex items-center gap-2 text-sm text-thirdly">
				<span class="material-icons text-accent-primary">psychology</span>
				<span>Using AI to optimize translation segmentation</span>
			</div>

			<div class="flex gap-3">
				<button class="btn px-6 py-2.5 font-medium" onclick={close}> Cancel </button>
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

	/* Enhanced gradient backgrounds */
	.bg-gradient-to-r.from-accent.to-bg-accent {
		background: linear-gradient(135deg, var(--bg-accent) 0%, var(--bg-secondary) 100%);
	}

	/* Enhanced hover effects */
	button:hover:not(:disabled) {
		transform: translateY(-1px);
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
	}

	.btn-accent:hover:not(:disabled) {
		box-shadow: 0 4px 16px rgba(88, 166, 255, 0.3);
	}

	/* Enhanced focus states */
	textarea:focus {
		transform: translateY(-1px);
		box-shadow: 0 4px 12px rgba(88, 166, 255, 0.2);
	}

	/* Better disabled state */
	button:disabled {
		transform: none !important;
		box-shadow: none !important;
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

	/* Step indicators */
	.bg-accent-primary,
	.bg-accent-secondary {
		position: relative;
		overflow: hidden;
	}

	.bg-accent-primary::before,
	.bg-accent-secondary::before {
		content: '';
		position: absolute;
		top: 0;
		left: -100%;
		width: 100%;
		height: 100%;
		background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent);
		transition: left 0.5s;
	}

	.bg-accent-primary:hover::before,
	.bg-accent-secondary:hover::before {
		left: 100%;
	}
</style>

import { currentProject } from '$lib/stores/ProjectStore';
import toast from 'svelte-french-toast';
import { get } from 'svelte/store';
import { getVerseTranslation } from './Translation';

let globalProcessButton: HTMLButtonElement;
let languageCodeToTranslate: string;

interface TranslationProcessState {
	isProcessing: boolean;
	abortController: AbortController | null;
}

const translationProcess: TranslationProcessState = {
	isProcessing: false,
	abortController: null
};

export async function fetchTranslationsFromGpt(
	button: HTMLButtonElement, // Renommage du paramètre
	languageCode: string
) {
	// Correction 2 : Assignation correcte au niveau du module
	globalProcessButton = button;
	languageCodeToTranslate = languageCode;

	try {
		if (!globalProcessButton) return;

		// Correction 3 : Logique d'annulation améliorée
		if (translationProcess.isProcessing) {
			translationProcess.abortController?.abort();
			return; // Retour précoce pour éviter le traitement supplémentaire
		}

		if (!languageCodeToTranslate) {
			toast.error('Please enter a language code.');
			return;
		}

		translationProcess.isProcessing = true;
		translationProcess.abortController = new AbortController();
		globalProcessButton.innerText = 'Stop translation process';

		const verses = createVerseDictionary();
		await processTranslations(verses);

		// Correction 4 : Déplacer le toast de succès avant le reset
		toast.success('Translation process completed.');
	} catch (error) {
		handleProcessError(error);
	} finally {
		// Correction 5 : Reset seulement si le processus était actif
		if (translationProcess.isProcessing) {
			resetProcessState();
		}
	}
}

function createVerseDictionary() {
	const verses: Record<string, { verseExtract: string; subtitleId: string }[]> = {};

	for (const subtitle of get(currentProject).timeline.subtitlesTracks[0].clips) {
		if (shouldSkipSubtitle(subtitle)) continue;

		const verseKey = `${subtitle.surah}:${subtitle.verse}`;
		verses[verseKey] ??= [];
		verses[verseKey].push({
			verseExtract: subtitle.text,
			subtitleId: subtitle.id
		});
	}

	return verses;
}

function shouldSkipSubtitle(subtitle: any): boolean {
	return (
		subtitle.isSilence ||
		subtitle.isCustomText ||
		subtitle.hadItTranslationEverBeenModified ||
		(subtitle.firstWordIndexInVerse === 0 && subtitle.isLastWordInVerse) ||
		subtitle.verse === -1 ||
		subtitle.surah === -1
	);
}

async function processTranslations(
	verses: Record<string, { verseExtract: string; subtitleId: string }[]>
) {
	const { signal } = translationProcess.abortController!;
	const translations = get(currentProject).projectSettings.addedTranslations;
	const hasValidLanguage = translations.some((t) => t.includes(languageCodeToTranslate!));

	if (!hasValidLanguage) {
		toast.error('Language code not found.');
		return;
	}

	for (const translation of translations) {
		if (!translation.includes(languageCodeToTranslate!)) continue;

		for (const [verseKey, verseExtracts] of Object.entries(verses)) {
			if (signal.aborted) return;

			await processVerse(translation, verseKey, verseExtracts, signal);
			await delay(1000); // Temporisation entre les requêtes
		}
	}
}

async function processVerse(
	translation: string,
	verseKey: string,
	verseExtracts: any[],
	signal: AbortSignal
) {
	try {
		toast(`Translating verse ${verseKey}...`, { duration: 1000, icon: '🔍' });

		const verseTranslation = await fetchTranslation(
			verseKey,
			verseExtracts.map((e) => e.verseExtract),
			translation,
			signal
		);

		updateSubtitles(verseExtracts, verseTranslation, translation);
		forceSubtitlesUpdate();
	} catch (error) {
		if (!signal.aborted) {
			console.error(`Error processing verse ${verseKey}:`, error);
			toast.error(`Failed to translate verse ${verseKey}`);
		}
	}
}

async function fetchTranslation(
	verseKey: string,
	extracts: string[],
	translation: string,
	signal: AbortSignal
) {
	const url = new URL('https://rayanestaszewski.fr/gpt-translation');
	url.searchParams.set('verseKey', verseKey);
	url.searchParams.set('verseExtract', JSON.stringify(extracts));
	url.searchParams.set(
		'verseTranslation',
		await getVerseTranslation(
			translation,
			Number(verseKey.split(':')[0]),
			Number(verseKey.split(':')[1])
		)
	);

	const response = await fetch(url.toString(), { signal });

	return response.json();
}

function updateSubtitles(verseExtracts: any[], translations: any, translationKey: string) {
	let tabTrans = [];
	try {
		tabTrans = JSON.parse(translations).translations;
	} catch (error) {
		console.error('Error parsing translations:', error, translations);
		toast.error('Failed to parse translations');
		return;
	}

	// Mise à jour directe avec find()
	for (const [index, extract] of verseExtracts.entries()) {
		const subtitle = get(currentProject).timeline.subtitlesTracks[0].clips.find(
			(s) => s.id === extract.subtitleId
		);

		if (subtitle && tabTrans[index]) {
			subtitle.translations[translationKey] = tabTrans[index];
			subtitle.hadItTranslationEverBeenModified = true;
		}
	}
}

function forceSubtitlesUpdate() {
	currentProject.update(() => {
		return { ...get(currentProject) };
	});
}

function resetProcessState() {
	translationProcess.isProcessing = false;
	translationProcess.abortController = null;
	if (globalProcessButton) {
		globalProcessButton.innerText = 'Automatic Translation using AI';
	}
}

function handleProcessError(error: any) {
	if (error.name === 'AbortError') {
		if (translationProcess.isProcessing) {
			toast.error('Translation process aborted');
		}
	} else {
		console.error('Unexpected error:', error);
		toast.error('An unexpected error occurred');
	}
}

function delay(ms: number) {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

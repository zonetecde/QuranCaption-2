import type { Edition } from '$lib/models/Edition';
import { getEditionFromName } from '$lib/stores/QuranStore';
import toast from 'svelte-french-toast';

// Cache for the translations
const caches = new Map<string, string>();

// Constant for no translation found
const NO_TRANSLATION = 'No translation found';

/**
 * Get the translation of a verse
 * @param surah The ID of the surah
 * @param verse The ID of the verse
 * @param editionName The name of the edition
 * @returns The translation or 'No translation found' if not found
 */
export async function getVerseTranslation(
	editionName: string,
	surah: number,
	verse: number,
	removeLatin = true
): Promise<string> {
	// Check if the surah and verse are valid
	if (surah === -1 || verse === -1) return NO_TRANSLATION;

	// Check if the translation is already cached
	const cacheKey = `${editionName}_${surah}_${verse}_${removeLatin}`;
	const cached = caches.get(cacheKey);
	if (cached) return cached;

	// Get the edition from the name
	const edition = getEditionFromName(editionName);
	if (!edition) return NO_TRANSLATION;

	try {
		// Fetch the translation from the API
		const url = buildTranslationUrl(edition, surah, verse, removeLatin);
		const response = await fetch(url);

		// Si la réponse n'est pas ok, on essaie de la télécharger sans les caractères latins
		if (!response.ok) {
			return handleFailedResponse(editionName, surah, verse, removeLatin);
		}

		// Parse the response and extract the text
		const translation = await response.json();
		const rawText = extractTextFromResponse(translation, surah, verse, edition);
		const processedText = processTranslationText(rawText, edition);

		// Cache the processed text
		caches.set(cacheKey, processedText);

		// Return the processed text (the translation)
		return processedText;
	} catch (error) {
		toast.error('Error fetching translation');
		return NO_TRANSLATION;
	}
}

// Helper functions
function buildTranslationUrl(
	edition: Edition,
	surah: number,
	verse: number,
	removeLatin: boolean
): string {
	// Si l'édition fait partie des 4 traductions prises via une autre API (pour les poncutations en fin de verset)
	if (edition.comments === 'PONCTUATION') {
		return edition.link.replace('{chapter}', surah.toString());
	}

	// Si l'édition fait partie d'une demande spéciale (saheeh international)
	if (edition.comments === 'SPECIAL_REQUEST') {
		return edition.link;
	}

	// Si l'édition fait partie d'une demande spéciale (saeed sato)
	if (edition.comments === 'SPECIAL_REQUEST_2') {
		return edition.link.replace('{surah}', surah.toString()).replace('{ayah}', verse.toString());
	}

	let baseUrl = edition.link.replace('.json', '');
	if (removeLatin) baseUrl = baseUrl.replace('-la', '');
	return `${baseUrl}/${surah}/${verse}.json`;
}

// Extract the text from the response based on the used API
function extractTextFromResponse(
	data: any,
	surah: number,
	verse: number,
	edition: Edition
): string {
	if (edition.comments === 'PONCTUATION') {
		return data[verse][1];
	} else if (edition.comments === 'SPECIAL_REQUEST') {
		for (const key in data['quran']['en.sahih']) {
			const item = data['quran']['en.sahih'][key];
			if (item.surah === surah && item.ayah === verse) {
				return item.verse;
			}
		}
		return NO_TRANSLATION;
	} else if (edition.comments === 'SPECIAL_REQUEST_2') {
		let trans = data.result.translation || NO_TRANSLATION;
		// remove all the text between brackets (footnotes)
		trans = trans.replace(/\[.*?\]/g, '');
		return trans;
	} else {
		return data.text;
	}
}

// Process the translation text to remove unwanted characters
function processTranslationText(text: string, edition: Edition): string {
	let processed = text.replace(/\[\d+\]/g, '');

	if (edition.comments === 'PONCTUATION') {
		processed = processed
			.replaceAll(' .', '.')
			.replaceAll(' ,', ',')
			.replaceAll(' ;', ';')
			.replaceAll(' ]', ']')
			.replaceAll('[ ', '[')
			.replaceAll(' )', ')')
			.replaceAll('( ', '(');
	}

	return processed;
}

// Handle failed response by trying to fetch the translation without Latin characters
async function handleFailedResponse(
	editionName: string,
	surah: number,
	verse: number,
	removeLatin: boolean
): Promise<string> {
	if (removeLatin) {
		return getVerseTranslation(editionName, surah, verse, false);
	}
	return NO_TRANSLATION;
}

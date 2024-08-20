import { get, writable, type Writable } from 'svelte/store';
import { type Quran } from '$lib/models/Quran';
import type { Edition } from '$lib/models/Edition';
import type { SubtitleClip } from '$lib/models/Timeline';

export const Mushaf: Writable<Quran> = writable();
export const editions: Writable<Edition[]> = writable();

/**
 * Load the Quran from the local file system
 * and set it in the store.
 * @throws Error if the Quran could not be loaded
 */
export async function getQuran() {
	if (get(Mushaf)) {
		return; // Already loaded
	}

	try {
		const response = await fetch('/quran/quran.json');
		const surahs = await response.json();

		Mushaf.set({
			surahs
		});
	} catch (e) {
		console.error(e);
	}
}

/**
 * Get editions
 * @returns All the Quran editions (translations)
 */
export async function getEditions() {
	if (get(editions)) {
		return; // Already loaded
	}

	try {
		const response = await fetch('/quran/editions.json');
		const editionsJson = await response.json();

		let _editions: Edition[] = [];
		// for each keys in the object
		for (const key in editionsJson) {
			_editions.push(editionsJson[key]);
		}

		// distinct the editions by author
		const distinct = (value: Edition, index: number, self: Edition[]) => {
			return self.findIndex((e) => e.author === value.author) === index;
		};
		_editions = _editions.filter(distinct);

		editions.set(_editions);
	} catch (e) {
		console.error(e);
	}
}

/**
 * Get a specific verse from the Quran
 * @param surahId The ID of the surah
 * @param verseId The ID of the verse
 * @returns The verse or undefined if not found
 */
export function getVerse(surahId: number, verseId: number) {
	const quran = get(Mushaf);
	return quran.surahs[surahId - 1].verses[verseId - 1];
}

/**
 * Get the number of verses in a surah
 * @param surahId The ID of the surah
 * @returns The number of verses
 */
export function getNumberOfVerses(surahId: number) {
	const quran = get(Mushaf);
	return quran.surahs[surahId - 1].total_verses;
}

// Cache for the translations
const caches = new Map<string, string>();

/**
 * Get the translation of a verse
 * @param surah The ID of the surah
 * @param verse The ID of the verse
 * @param editionName The name of the edition
 * @returns The translation or 'No translation found' if not found
 */
export async function downloadTranslationForVerse(
	editionName: string,
	surah: number,
	verse: number,
	removeLatin: boolean = true
) {
	const cached = caches.get(`${editionName}_${surah}_${verse}_${removeLatin}`);
	if (cached) return cached;

	const edition = getEditionFromName(editionName);
	if (!edition) return 'No translation found';

	let url = edition.link.replace('.json', ''); // remove the "-la" from the link because we want the accents.
	if (removeLatin) url = url.replace('-la', '');

	const response = await fetch(url + '/' + surah + '/' + verse + '.json');

	if (response.ok) {
		const translation = await response.json();
		let text = translation.text;

		// Enlève les nombres entre crochets
		text = text.replace(/\[\d+\]/g, '');

		// Ajout de la traduction dans le cache
		caches.set(`${editionName}_${surah}_${verse}_${removeLatin}`, text);

		return text;
	} else if (removeLatin) {
		return await downloadTranslationForVerse(editionName, surah, verse, false);
	} else {
		return 'No translation found';
	}
}

/**
 * Get the edition from its name
 * @param name The name of the edition
 * @returns The edition or undefined if not found
 */
export function getEditionFromName(name: string) {
	return get(editions).find((edition) => edition.name === name);
}

export async function getWordByWordTranslation(surahNumber: number, verseNumber: number) {
	if (surahNumber === -1 || verseNumber === -1) {
		return []; // Si c'est un silence, une basmala ou autre
	}

	let wbwTranslation: string[] = [];

	// Télécharge la traduction mot à mot
	const url = `https://api.quranwbw.com/v1/verses?verses=${surahNumber}:${verseNumber}`;
	const response = await fetch(url);
	if (response.ok) {
		const data = await response.json();
		let lines = JSON.stringify(data, null, 2).split('\n');
		let i = 0;
		while (!lines[i].includes('"translation"')) {
			i++;
		}
		let translation = lines[i].split(':')[1].trim().replace(/"/g, '');
		wbwTranslation = translation.split('|');
	}

	return wbwTranslation;
}

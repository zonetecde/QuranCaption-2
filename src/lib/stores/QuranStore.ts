import type { Edition } from '$lib/models/Edition';
import { type Quran } from '$lib/models/Quran';
import { get, writable, type Writable } from 'svelte/store';

export const Mushaf: Writable<Quran> = writable();
export const editions: Writable<Edition[]> = writable();

/**
 * Load the Quran from the local file system
 * and set it in the store.
 * @throws Error if the Quran could not be loaded
 */
export async function loadQuran() {
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
	if (surahId < 1 || surahId > 114) return { text: '' };
	if (verseId < 1 || verseId > getNumberOfVerses(surahId)) return { text: '' };

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

/**
 * Get the name of a surah
 * @param surahId The ID of the surah
 * @returns The name of the surah
 */
export function getSurahName(surahId: number) {
	const quran = get(Mushaf);
	return quran.surahs[surahId - 1].transliteration;
}

/**
 * Get the edition from its name
 * @param name The name of the edition
 * @returns The edition or undefined if not found
 */
export function getEditionFromName(name: string): Edition | undefined {
	return get(editions).find((edition) => edition.name === name);
}

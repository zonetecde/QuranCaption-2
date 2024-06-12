import { get, writable, type Writable } from 'svelte/store';
import { type Quran } from '$lib/models/Quran';

export const Mushaf: Writable<Quran> = writable();

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

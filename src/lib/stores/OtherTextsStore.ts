import { localStorageWrapper } from '$lib/ext/LocalStorageWrapper';
import type { Surah } from '$lib/models/Quran';
import { get, writable } from 'svelte/store';

export const OtherTexts = writable<Surah[]>([]);

/**
 * Load the other texts from the local file system
 * and set it in the store.
 */
export async function loadOtherTexts() {
	if (get(OtherTexts) && get(OtherTexts).length > 0) {
		return; // Already loaded
	}

	try {
		const response = await localStorageWrapper.getItem('otherTexts');
		OtherTexts.set(response || []);
	} catch (e) {
		console.error(e);
	}
}

export async function saveOtherTexts() {
	const texts = get(OtherTexts);

	// set the `total_verses` property for each text
	for (const text of texts) {
		text.total_verses = text.verses.length;
	}

	await localStorageWrapper.setItem('otherTexts', texts);
}

export function getNumberOfVersesOfText(textId: number) {
	const text = get(OtherTexts).find((t) => t.id === textId);
	return text ? text.total_verses : 0;
}

export function getVerseFromText(selectedTextId: number | null, verseNumber: number): string {
	// Get the selected text
	const selectedText = get(OtherTexts).find((text) => text.id === selectedTextId);

	if (!selectedText) return '';

	// Get the verse from the selected text
	const verse = selectedText.verses.find((verse) => verse.id === verseNumber);

	if (!verse) return '';

	// Format the verse text
	// Remove the *** at the beginning
	return verse.text;
}

export function getTextName(textId: number): string {
	const text = get(OtherTexts).find((t) => t.id === textId);
	return text ? text.name : '';
}

export function getTextTranslations(textId: number, verseId: number): { [key: string]: string } {
	const text = get(OtherTexts).find((t) => t.id === textId);
	if (!text) return {};

	const verse = text.verses.find((v) => v.id === verseId);
	if (!verse) return {};

	return verse.translations;
}

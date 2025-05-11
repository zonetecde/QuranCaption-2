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

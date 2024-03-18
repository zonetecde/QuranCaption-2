import { writable, type Writable } from 'svelte/store';

export const clips: Writable<string[]> = writable([]);

/**
 * Add videos to the store and remove duplicates
 * @param fileNames - The file names to add
 */
export function addClips(fileNames: string | string[]) {
	if (Array.isArray(fileNames)) {
		clips.update((v) => [...v, ...fileNames]);
	} else {
		clips.update((v) => [...v, fileNames]);
	}

	// Remove duplicates
	clips.update((v) => [...new Set(v)]);
}

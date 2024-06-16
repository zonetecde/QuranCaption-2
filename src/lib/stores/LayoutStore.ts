import { writable, type Writable } from 'svelte/store';

export type PageType = 'Video editor' | 'Subtitles editor' | 'Export';
export const currentPage: Writable<PageType> = writable('Video editor');
export const trimDialog: Writable<string | undefined> = writable(undefined); // When set to undefined the dialog is closed. When set to a string the dialog is opened with the string as the id of the clip to trim.
export const selectedSubtitlesLanguage: Writable<string> = writable('global');

export function setCurrentPage(page: PageType) {
	currentPage.set(page);
}

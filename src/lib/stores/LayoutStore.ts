import { writable, type Writable } from 'svelte/store';

export type PageType = 'Video editor' | 'Subtitle editor' | 'Export';
export const currentPage: Writable<PageType> = writable('Video editor');
export const trimDialog: Writable<string | undefined> = writable(undefined); // When set to undefined the dialog is closed. When set to a string the dialog is opened with the string as the id of the clip to trim.

export function setCurrentPage(page: PageType) {
	currentPage.set(page);
}

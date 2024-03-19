import { writable, type Writable } from 'svelte/store';

export type PageType = 'Video editor' | 'Subtitle editor' | 'Export';
export const currentPage: Writable<PageType> = writable('Video editor');

export function setCurrentPage(page: PageType) {
	currentPage.set(page);
}

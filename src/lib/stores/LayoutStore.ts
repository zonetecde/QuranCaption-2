import { invoke } from '@tauri-apps/api';
import { get, writable, type Writable } from 'svelte/store';

export type PageType = 'Video editor' | 'Subtitles editor' | 'Translations' | 'Export';
export const currentPage: Writable<PageType> = writable('Video editor');
export const trimDialog: Writable<string | undefined> = writable(undefined); // When set to undefined the dialog is closed. When set to a string the dialog is opened with the string as the id of the clip to trim.
export const selectedSubtitlesLanguage: Writable<string> = writable('global'); // Afin de mémoriser le choix de l'utilisateur entre les différents onglets
export const showSubtitlesPadding: Writable<boolean> = writable(false); // Lorsqu'on modifie le paramètre du padding, affichage visuelle
export const userFonts: Writable<string[]> = writable([]); // Les polices de l'utilisateur

export function setCurrentPage(page: PageType) {
	currentPage.set(page);
}

export async function getFonts() {
	userFonts.set(await invoke('all_families'));
}

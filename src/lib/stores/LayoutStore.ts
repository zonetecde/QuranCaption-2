import { invoke } from '@tauri-apps/api';
import { get, writable, type Writable } from 'svelte/store';

export type PageType = 'Video editor' | 'Subtitles editor' | 'Translations' | 'Export';

// System
export const userFonts: Writable<string[]> = writable([]); // Les polices de l'utilisateur
export const newUpdateAvailable: Writable<boolean> = writable(false); // Indique si une nouvelle version est disponible
export const newUpdateDescription: Writable<string> = writable(''); // La description de la nouvelle version
export const fullScreenPreview: Writable<boolean> = writable(false); // Indique si la prévisualisation est en plein écran
export const bestPerformance: Writable<boolean> = writable(false); // Indique si l'utilisateur a choisi la meilleure performance (cache les timings sur la timeline)

// Layout
export const currentPage: Writable<PageType> = writable('Video editor');
export const trimDialog: Writable<string | undefined> = writable(undefined); // When set to undefined the dialog is closed. When set to a string the dialog is opened with the string as the id of the clip to trim.

// Video Preview
export const videoDimensions: Writable<{ width: number; height: number }> = writable({
	width: 0,
	height: 0
}); // Les dimensions de la vidéo

// Subtitles editor
export const selectedSubtitlesLanguage: Writable<string> = writable('global'); // Afin de mémoriser le choix de l'utilisateur entre les différents onglets
export const showSubtitlesPadding: Writable<boolean> = writable(false); // Lorsqu'on modifie le paramètre du padding, affichage visuelle
export const showWordByWordTranslation: Writable<boolean> = writable(false); // Checkbox pour afficher les traductions des mots dans le subtitles editor

// Video editor
export const videoEditorSelectedTab: Writable<'assets manager' | 'subtitles settings'> =
	writable('assets manager'); // L'onglet sélectionné dans l'éditeur vidéo

// Translation page
export const onlyShowSubtitlesThatAreNotFullVerses: Writable<boolean> = writable(false); // Afficher uniquement les versets qui ont besoin d'une révision de traduction
export const onlyShowVersesWhoseTranslationsNeedReview: Writable<boolean> = writable(false); // Afficher uniquement les versets dont les traductions ont besoin d'une révision
export const isFetchingIA: Writable<boolean> = writable(false); // Indique si on est en train de récupérer les informations de l'IA

export function setCurrentPage(page: PageType) {
	currentPage.set(page);
}

export async function getFonts() {
	userFonts.set(await invoke('all_families'));
}

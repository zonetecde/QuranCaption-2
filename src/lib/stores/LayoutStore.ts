import { allStatus, type ProjectStatus } from '$lib/models/Project';
import { invoke } from '@tauri-apps/api';
import toast from 'svelte-french-toast';
import { get, writable, type Writable } from 'svelte/store';
import { currentProject } from './ProjectStore';

export type PageType = 'Video editor' | 'Subtitles editor' | 'Translations' | 'Export';
// Home page
export const sortDirection: Writable<'asc' | 'desc'> = writable('desc');
export const sortType: Writable<'updatedAt' | 'createdAt' | 'name' | 'duration' | 'reciter'> =
	writable('updatedAt');
export const onlyShowThosesWithStatus: Writable<ProjectStatus[]> = writable(allStatus);

// System
export const userFonts: Writable<string[]> = writable([]); // Les polices de l'utilisateur
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
export const videoSpeed: Writable<number> = writable(1); // La vitesse de la vidéo
export const setCurrentVideoTime: Writable<number | undefined> = writable(undefined); // Change l'endroit où la vidéo est en train de jouer.
export const showSubtitlesPadding: Writable<boolean> = writable(false); // Lorsqu'on modifie le paramètre du padding, affichage visuelle

// Subtitles Settings
export const currentlyCustomizedSubtitleId: Writable<string | undefined> = writable(undefined); // L'id du sous-titre actuellement personnalisé

// Subtitles editor
export const selectedSubtitlesLanguage: Writable<string> = writable('global'); // Afin de mémoriser le choix de l'utilisateur entre les différents onglets
export const showWordByWordTranslation: Writable<boolean> = writable(true); // Checkbox pour afficher les traductions des mots dans le subtitles editor
export const showWordByWordTransliteration: Writable<boolean> = writable(false); // Checkbox pour afficher les translittérations des mots dans le subtitles editor
export const currentlyEditedSubtitleId: Writable<string | undefined> = writable(undefined); // L'id du sous-titre actuellement édité
export const isRemplacingAlreadyAddedSubtitles: Writable<boolean> = writable(false); // Indique si on est en train de remplacer des sous-titres déjà ajoutés
export const beginTimeReplacing: Writable<number | undefined> = writable(undefined); // Le temps de début de la zone de remplacement
export const endTimeReplacing: Writable<number | undefined> = writable(undefined); // Le temps de fin de la zone de remplacement
export const addOtherTextsPopupVisibility: Writable<boolean> = writable(false); // Indique si le popup pour ajouter d'autres textes est visible

endTimeReplacing.subscribe((endTime) => {
	if (endTime) {
		isRemplacingAlreadyAddedSubtitles.set(true);
		clearSubtitleToEdit();
	}
});
beginTimeReplacing.subscribe((beginTime) => {
	if (beginTime) {
		isRemplacingAlreadyAddedSubtitles.set(true);
		clearSubtitleToEdit();
	}
});

export function clearBeginAndEndTimeReplacing() {
	beginTimeReplacing.set(undefined);
	endTimeReplacing.set(undefined);
	isRemplacingAlreadyAddedSubtitles.set(false);
}

currentlyEditedSubtitleId.subscribe((id) => {
	// Protection contre le fait d'éditer un sous-titre qui est un silence/custom text
	if (id) {
		const subtitleClip = get(currentProject).timeline.subtitlesTracks[0].clips.find(
			(clip) => clip.id === id
		);
		if (subtitleClip && (subtitleClip.verse === -1 || subtitleClip.surah === -1)) {
			clearSubtitleToEdit();
			toast.error('You cannot edit this subtitle.');
		}
	}
});

// Set the subtitle to edit
// Si on est pas déjà sur la page d'édition, on switch sur la page d'édition
export async function setSubtitleToEdit(id: string) {
	if (get(currentPage) !== 'Subtitles editor') {
		// switch sur la page d'édition
		setCurrentPage('Subtitles editor');
		await new Promise((resolve) => setTimeout(resolve, 0));
	}

	// set le subtitle à éditer
	currentlyEditedSubtitleId.set(id);
}

export function clearSubtitleToEdit() {
	currentlyEditedSubtitleId.set(undefined);
}

// Video editor
export const videoEditorSelectedTab: Writable<'assets manager' | 'subtitles settings'> =
	writable('assets manager'); // L'onglet sélectionné dans l'éditeur vidéo

// Translation page
export const onlyShowSubtitlesThatAreNotFullVerses: Writable<boolean> = writable(false); // Afficher uniquement les versets qui ont besoin d'une révision de traduction
export const onlyShowVersesWhoseTranslationsNeedReview: Writable<boolean> = writable(false); // Afficher uniquement les versets dont les traductions ont besoin d'une révision
export const isFetchingIA: Writable<boolean> = writable(false); // Indique si on est en train de récupérer les informations de l'IA
export const audio: Writable<HTMLAudioElement | undefined> = writable(undefined); // L'audio player pour écouter individuellement les subtitles
export const playedSubtitleId: Writable<string | undefined> = writable(undefined); // Le fichier audio à écouter

export function setCurrentPage(page: PageType) {
	currentPage.set(page);
}

export async function getFonts() {
	userFonts.set(await invoke('all_families'));
}

/**
 * Calcule la position verticale ajustée en fonction des dimensions de la vidéo
 * @param height Hauteur de la vidéo en pixels
 * @param width Largeur de la vidéo en pixels
 * @param verticalPosition Position verticale en pourcentage (0-100)
 * @param isFullScreen Indique si la vidéo est en plein écran
 * @returns Position verticale ajustée en pixels
 */
export function calculateAdjustedVerticalPosition(
	height: number,
	width: number,
	verticalPosition: number,
	isFullScreen: boolean = true
): number {
	const aspectRatio = width / height;
	const verticalPositionPercentage = verticalPosition / 100;

	// Ajuste la position verticale en fonction des proportions de la vidéo
	const verticalAdjustmentFactor =
		aspectRatio > 2.5
			? 0.92 // Vidéos extrêmement larges (cinémascope)
			: aspectRatio > 2.0
				? 0.95 // Vidéos ultra-larges - monte le texte
				: aspectRatio > 1.85
					? 0.98 // Format cinéma standard
					: aspectRatio > 1.7
						? 1.0 // Format standard 16:9
						: aspectRatio > 1.5
							? 1.02 // Entre 16:9 et 4:3
							: aspectRatio > 1.3
								? 1.05 // Format 4:3 - descend légèrement
								: aspectRatio > 1.0
									? 1.1 // Format presque carré
									: 1.15; // Format portrait - descend davantage

	// Facteur dynamique qui s'adapte de façon continue à l'aspect ratio
	const dynamicHeightFactor = Math.min(
		1,
		Math.max(0.85, 1 - (1 / Math.pow(aspectRatio, 0.7)) * 0.15)
	);

	// Ajustement pour le mode aperçu vs plein écran
	const previewModeAdjustment = isFullScreen ? 1 : 0.97;

	return (
		height *
		verticalPositionPercentage *
		verticalAdjustmentFactor *
		dynamicHeightFactor *
		previewModeAdjustment
	);
}

import { currentProject } from '$lib/stores/ProjectStore';
import { cursorPosition } from '$lib/stores/TimelineStore';
import { get } from 'svelte/store';

/**
 * Réajuste la position du curseur en fonction de la lecture vidéo ou audio
 * @param useVideoPreview - Détermine si l'ajustement se fait sur la vidéo (true) ou l'audio (false)
 *
 * @remarks
 * - Gère à la fois les timelines simples et complexes avec multiples clips
 * - Prend en compte le délai de synchronisation des médias
 * - Optimise les performances avec un calcul intelligent de la durée cumulée
 */
export function readjustCursorPosition(useVideoPreview: boolean) {
	// Récupération de l'élément média approprié
	const mediaId = useVideoPreview ? 'video-preview' : 'audio-preview';
	const mediaPreviewElement = document.getElementById(mediaId) as HTMLMediaElement;

	if (!mediaPreviewElement || isNaN(mediaPreviewElement.currentTime)) {
		console.error('Élément média non trouvé ou temps non disponible');
		return;
	}

	// Détermination de la piste média à utiliser
	const mediaType = useVideoPreview ? 'videosTracks' : 'audiosTracks';
	const clips = get(currentProject).timeline[mediaType][0].clips;

	// Cas particulier : timeline avec un seul clip
	if (clips.length === 1) {
		cursorPosition.set(mediaPreviewElement.currentTime * 1000);
		return;
	}

	// Calcul de la durée cumulée des clips précédents
	const currentClipIndex = clips.findIndex((clip) =>
		mediaPreviewElement.classList.contains(clip.id)
	);

	const totalDuration = clips
		.slice(0, currentClipIndex)
		.reduce((sum, clip) => sum + clip.duration, 0);

	// Calcul de la nouvelle position avec gestion de la synchronisation
	const calculateNewPosition = () => {
		const currentTimeMs = mediaPreviewElement.currentTime * 1000;
		return currentTimeMs + totalDuration;
	};

	// Application avec délai conditionnel pour la stabilité des updates
	if (totalDuration > 0) {
		setTimeout(() => cursorPosition.set(calculateNewPosition()), 500);
	} else {
		cursorPosition.set(calculateNewPosition());
	}
}

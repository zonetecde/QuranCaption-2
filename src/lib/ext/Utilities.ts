import { videoDimensions } from '$lib/stores/LayoutStore';
import { invoke } from '@tauri-apps/api/tauri';
import { get } from 'svelte/store';
import { open } from '@tauri-apps/api/dialog';
import { currentProject } from '$lib/stores/ProjectStore';
import { cursorPosition } from '$lib/stores/TimelineStore';

/**
 * Récupère la taille de la vidéo affichée dans le composant.
 * Ne prend pas en compte les marges et les paddings.
 * @returns La largeur et la hauteur de la vidéo affichée.
 */
export function getDisplayedVideoSize(videoComponent: HTMLVideoElement) {
	const videoWidth = videoComponent.videoWidth;
	const videoHeight = videoComponent.videoHeight;
	const containerWidth = videoComponent.clientWidth;
	const containerHeight = videoComponent.clientHeight;

	const videoRatio = videoWidth / videoHeight;
	const containerRatio = containerWidth / containerHeight;

	let displayedWidth, displayedHeight;

	if (containerRatio > videoRatio) {
		displayedHeight = containerHeight;
		displayedWidth = displayedHeight * videoRatio;
	} else {
		displayedWidth = containerWidth;
		displayedHeight = displayedWidth / videoRatio;
	}

	return { displayedWidth, displayedHeight };
}

export function calculateFontSize(fontSize: number) {
	// Calcul la taille de la police pour les sous-titres
	return get(videoDimensions).width / (140 - fontSize);
}

export function latinNumberToArabic(number: string) {
	return number.replace(/[0-9]/g, (d) => String.fromCharCode(d.charCodeAt(0) + 1584));
}

export function downloadFile(content: string, filename: string) {
	const blob = new Blob([content], { type: 'application/json' });
	const url = URL.createObjectURL(blob);
	const a = document.createElement('a');
	a.href = url;
	a.download = filename;
	a.click();
	URL.revokeObjectURL(url);
}

export async function importAndReadFile(
	fileName: string,
	fileExtensions: string[] = ['qc2']
): Promise<string | null> {
	const selected = await open({
		multiple: false,
		filters: [
			{
				name: fileName,
				extensions: fileExtensions
			}
		]
	});

	if (!Array.isArray(selected) && selected !== null) {
		// Read the file's content
		const content: string = await invoke('get_file_content', {
			path: selected
		});

		return content;
	}

	return null;
}

/**
 * Reajust the cursor position according to the video or the audio
 * @param useVideoPreview If true, the cursor position will be reajusted according to the video preview, otherwise it will be reajusted according to the audio preview
 */
export function reajustCursorPosition(useVideoPreview: boolean) {
	const mediaPreviewElement = document.getElementById(
		useVideoPreview ? 'video-preview' : 'audio-preview'
	) as any;

	if (mediaPreviewElement) {
		// Vérifie que c'est la seul vidéo dans la timeline (sinon on prend la pos du curseur)
		if (get(currentProject).timeline.videosTracks[0].clips.length === 1) {
			cursorPosition.set(mediaPreviewElement.currentTime * 1000);
		} else {
			// Si il y a plusieurs vidéos ont doit aussi ajouter la durée de toutes les vidéos d'avant
			let totalDuration = 0;

			const clips = useVideoPreview
				? get(currentProject).timeline.videosTracks[0].clips
				: get(currentProject).timeline.audiosTracks[0].clips;

			for (let i = 0; i < clips.length; i++) {
				const video = clips[i];
				if (!mediaPreviewElement.classList.contains(video.id)) {
					totalDuration += video.duration;
				} else {
					break;
				}
			}

			if (totalDuration > 0) {
				setTimeout(() => {
					cursorPosition.set(mediaPreviewElement.currentTime * 1000 + totalDuration);
				}, 500);
			} else cursorPosition.set(mediaPreviewElement.currentTime * 1000 + totalDuration);
		}
	}
}

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

export function reajustCursorPosition() {
	const videoPreviewElement = document.getElementById('video-preview') as HTMLVideoElement;

	if (videoPreviewElement) {
		// Vérifie que c'est la seul vidéo dans la timeline (sinon on prend la pos du curseur)
		if (get(currentProject).timeline.videosTracks[0].clips.length === 1) {
			cursorPosition.set(videoPreviewElement.currentTime * 1000);
		} else {
			// Si il y a plusieurs vidéos ont doit aussi ajouter la durée de toutes les vidéos d'avant
			let totalDuration = 0;
			for (let i = 0; i < get(currentProject).timeline.videosTracks[0].clips.length; i++) {
				const video = get(currentProject).timeline.videosTracks[0].clips[i];
				if (!videoPreviewElement.classList.contains(video.id)) {
					totalDuration += video.duration;
				} else {
					break;
				}
			}

			if (totalDuration > 0) {
				setTimeout(() => {
					cursorPosition.set(videoPreviewElement.currentTime * 1000 + totalDuration);
				}, 500);
			} else cursorPosition.set(videoPreviewElement.currentTime * 1000 + totalDuration);
		}
	}
}

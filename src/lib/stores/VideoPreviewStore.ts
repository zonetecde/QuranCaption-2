import { readjustCursorPosition } from '$lib/functions/TimelineHelper';
import { get, writable, type Writable } from 'svelte/store';
import { cursorPosition } from './TimelineStore';

export const isPreviewPlaying: Writable<boolean> = writable(false);
export const latestSurah: Writable<number> = writable(-1); // The latest surah that was played in the preview
export const isCalculatingNeededHeights: Writable<boolean> = writable(false);

/**
 * Récupère le temps actuel du curseur
 */
export function getCurrentCursorTime() {
	const audioElement = document.getElementById('audio-preview') as HTMLAudioElement;
	let currentTimeMs = 0;
	if (audioElement) currentTimeMs = audioElement.currentTime * 1000;
	else {
		const videoElement = document.getElementById('video-preview') as HTMLVideoElement;
		if (videoElement) currentTimeMs = videoElement.currentTime * 1000;
		else currentTimeMs = get(cursorPosition);
	}

	readjustCursorPosition(false);
	return currentTimeMs;
}

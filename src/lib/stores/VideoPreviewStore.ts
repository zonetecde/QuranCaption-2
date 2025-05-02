import { writable, type Writable } from 'svelte/store';

export const isPreviewPlaying: Writable<boolean> = writable(false);
export const latestSurah: Writable<number> = writable(-1); // The latest surah that was played in the preview

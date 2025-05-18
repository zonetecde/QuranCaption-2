import type { ExportType } from '$lib/models/Project';
import { writable, type Writable } from 'svelte/store';

export const startTime: Writable<number> = writable(0);
export const endTime: Writable<number | null> = writable(null);
export const orientation: Writable<'landscape' | 'portrait'> = writable('landscape');

export const exportType: Writable<ExportType> = writable('video-static');
export const currentlyExporting: Writable<boolean> = writable(false); // Indique si on est en train d'exporter
export const triggerSubtitleResize: Writable<boolean> = writable(false); // Indique si on doit redimensionner les sous-titres

// Video section ratios (in percentage)
export const topRatio: Writable<number> = writable(25); // default: 20%
export const middleRatio: Writable<number> = writable(50); // default: 60%
export const bottomRatio: Writable<number> = writable(25); // default: 20%

export const quality: Writable<number> = writable(1); // default: 1

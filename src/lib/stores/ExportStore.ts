import { createOrUpdateExportDetailsWindow } from '$lib/functions/ExportProject';
import type { ExportType } from '$lib/models/Project';
import { appWindow } from '@tauri-apps/api/window';
import { writable, type Writable } from 'svelte/store';

export const startTime: Writable<number> = writable(0);
export const endTime: Writable<number | null> = writable(null);
export const orientation: Writable<'landscape' | 'portrait'> = writable('landscape');

export const exportType: Writable<ExportType> = writable('video-static');
export const currentlyExporting: Writable<boolean> = writable(false); // Indique si on est en train d'exporter
export const triggerSubtitleResize: Writable<boolean> = writable(false); // Indique si on doit redimensionner les sous-titres
export const currentlyExportingId: Writable<number | null> = writable(null); // ID de l'exportation en cours

// Video section ratios (in percentage)
export const topRatio: Writable<number> = writable(25); // default: 20%
export const middleRatio: Writable<number> = writable(50); // default: 60%
export const bottomRatio: Writable<number> = writable(25); // default: 20%

export const quality: Writable<number> = writable(1); // default: 1

export const currentlyExportingVideos: Writable<CurrentlyExportingVideoDetail[]> = writable([
	{
		exportId: 13234,
		projectName: 'Project 1',
		startTime: 1000,
		endTime: 0,
		portrait: false,
		status: 'taking frames'
	},
	{
		exportId: 13235,
		projectName: 'Project 2',
		startTime: 2000,
		endTime: 0,
		portrait: true,
		status: 'exporting'
	},
	{
		exportId: 13236,
		projectName: 'Project 3',
		startTime: 3000,
		endTime: 0,
		portrait: false,
		status: 'finished'
	},
	{
		exportId: 13237,
		projectName: 'Project 4',
		startTime: 4000,
		endTime: 0,
		portrait: true,
		status: 'error'
	}
]);

export interface CurrentlyExportingVideoDetail {
	exportId: number;
	projectName: string;
	startTime: number;
	endTime: number;
	portrait: boolean;
	status: 'taking frames' | 'exporting' | 'finished' | 'error';
}

currentlyExportingVideos.subscribe((videos) => {
	// Il n'y a que le main qui peut envoyer des messages (sinon boucle infinie)
	if (appWindow.label === 'main' && videos.length > 0) createOrUpdateExportDetailsWindow();
});

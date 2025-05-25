import { createOrShowExportDetailsWindow } from '$lib/functions/ExportProject';
import type Project from '$lib/models/Project';
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
export const showWm: Writable<boolean> = writable(false);
export const fps: Writable<number> = writable(30); // default: 30 FPS

export const enableWm: Writable<boolean> = writable(true);

export interface VideoExportStatus {
	exportId: number;
	projectName: string;
	portrait: boolean;
	status: string;
	progress: number; // 0-100
	outputPath: string; // Chemin de sortie du fichier
	date: Date; // Date de l'export
	selectedVersesRange: string; // Plage de versets sélectionnée pour l'export
}

export function initExportSettings(project: Project) {
	if (project.projectSettings.exportSettings !== undefined) {
		startTime.set(project.projectSettings.exportSettings.startTime);
		endTime.set(project.projectSettings.exportSettings.endTime);
		orientation.set(project.projectSettings.exportSettings.orientation);
		exportType.set(project.projectSettings.exportSettings.exportType);
		topRatio.set(project.projectSettings.exportSettings.topRatio);
		middleRatio.set(project.projectSettings.exportSettings.middleRatio);
		bottomRatio.set(project.projectSettings.exportSettings.bottomRatio);
		quality.set(project.projectSettings.exportSettings.quality);
		fps.set(project.projectSettings.exportSettings.fps); // Set default FPS if not defined
	} else {
		// If the project doesn't have the export settings, set the default values
		project.projectSettings.exportSettings = {
			startTime: 0,
			endTime: null,
			orientation: 'landscape',
			exportType: 'video-static',
			topRatio: 25,
			middleRatio: 50,
			bottomRatio: 25,
			quality: 1,
			fps: 30 // default FPS
		};
	}
}

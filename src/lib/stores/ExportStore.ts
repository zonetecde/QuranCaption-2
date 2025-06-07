import { createOrShowExportDetailsWindow } from '$lib/functions/ExportProject';
import type Project from '$lib/models/Project';
import type { ExportSettings, ExportType } from '$lib/models/Project';
import { appWindow } from '@tauri-apps/api/window';
import { get, writable, type Writable } from 'svelte/store';

export const startTime: Writable<number> = writable(0);
export const endTime: Writable<number | null> = writable(null);
export const orientation: Writable<'landscape' | 'portrait'> = writable('landscape');

export const exportType: Writable<ExportType> = writable('video-static');
export const currentlyExporting: Writable<boolean> = writable(false); // Indique si on est en train d'exporter
export const triggerSubtitleResize: Writable<boolean> = writable(false); // Indique si on doit redimensionner les sous-titres
export const currentlyExportingId: Writable<string | null> = writable(null); // ID de l'exportation en cours

// Video section ratios (in percentage)
export const topRatio: Writable<number> = writable(25); // default: 20%
export const middleRatio: Writable<number> = writable(50); // default: 60%
export const bottomRatio: Writable<number> = writable(25); // default: 20%

export const quality: Writable<number> = writable(1); // default: 1
export const fps: Writable<number> = writable(30); // default: 30 FPS
export const oneVideoPerAyah: Writable<boolean> = writable(false); // default: false

export interface VideoExportStatus {
	exportId: string;
	projectName: string;
	portrait: boolean;
	status: string;
	progress: number; // 0-100
	outputPath: string; // Chemin de sortie du fichier
	date: Date; // Date de l'export
	selectedVersesRange: string; // Plage de versets sélectionnée pour l'export
}

export function initExportSettingsFromSettings(settings: ExportSettings) {
	startTime.set(settings.startTime);
	endTime.set(settings.endTime);
	orientation.set(settings.orientation);
	exportType.set(settings.exportType);
	topRatio.set(settings.topRatio);
	middleRatio.set(settings.middleRatio);
	bottomRatio.set(settings.bottomRatio);
}

export function runesToExportSettings() {
	return {
		startTime: get(startTime),
		endTime: get(endTime),
		orientation: get(orientation),
		exportType: get(exportType),
		topRatio: get(topRatio),
		middleRatio: get(middleRatio),
		bottomRatio: get(bottomRatio),
		quality: get(quality),
		fps: get(fps),
		oneVideoPerAyah: get(oneVideoPerAyah)
	};
}

export function initExportSettings(project: Project) {
	if (project.projectSettings.exportSettings !== undefined) {
		initExportSettingsFromSettings(project.projectSettings.exportSettings);
		quality.set(project.projectSettings.exportSettings.quality);
		fps.set(project.projectSettings.exportSettings.fps); // Set default FPS if not defined
		oneVideoPerAyah.set(project.projectSettings.exportSettings.oneVideoPerAyah || false); // Set default for oneVideoPerAyah if not defined
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
			fps: 30, // default FPS
			oneVideoPerAyah: false // default for oneVideoPerAyah
		};
	}
}

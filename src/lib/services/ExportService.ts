import { VerseRange, type Project } from '$lib/classes';
import { exists, readTextFile, remove, writeTextFile } from '@tauri-apps/plugin-fs';
import { appDataDir, join } from '@tauri-apps/api/path';
import { globalState } from '$lib/runes/main.svelte';
import Exportation, { ExportState } from '$lib/classes/Exportation.svelte';
import { ProjectService } from './ProjectService';
import { listen } from '@tauri-apps/api/event';

export default class ExportService {
	static exportFolder: string = 'exports/';

	constructor() {}

	/**
	 * Charge un projet (utiliser par la fenêtre d'export)
	 * @param exportId L'ID d'exportation (qui est aussi l'ID du projet)
	 * @returns Le projet
	 */
	static async loadProject(exportId: number): Promise<Project> {
		return await ProjectService.load(exportId, false, this.exportFolder);
	}

	/**
	 * Enregistre un projet dans le dossier export. Le nom du fichier
	 * est l'id du projet (soit l'idée de l'export)
	 * @param project Le projet à exporter
	 */
	static async saveProject(project: Project) {
		const folder: string = await ProjectService.ensureFolder(this.exportFolder);

		// Enregistre le projet dans le dossier d'export
		await writeTextFile(
			await join(folder, project.detail.id.toString() + '.json'),
			JSON.stringify(project.toJSON(), null, 2)
		);
	}

	/**
	 * Retourne le chemin du dossier d'export.
	 * @returns Le chemin du dossier d'export
	 */
	static async getExportFolder(): Promise<string> {
		return join(await appDataDir(), this.exportFolder);
	}

	/**
	 * Ajoute un projet à la liste des exports en cours.
	 * @param project Le projet à ajouter
	 */
	static async addExport(project: Project, mode: 'recording' | 'stable' = 'stable') {
		// Ajoute le projet à la liste des exports en cours

		const fileName = project.detail.generateExportFileName() + '.mp4';
		const filePath = await join(await this.getExportFolder(), fileName);

		globalState.exportations.unshift(
			new Exportation(
				project.detail.id,
				fileName,
				filePath,
				globalState.getStyle('global', 'video-dimension').value,
				project.projectEditorState.export.videoStartTime,
				project.projectEditorState.export.videoEndTime,
				VerseRange.getVerseRange(
					project.projectEditorState.export.videoStartTime,
					project.projectEditorState.export.videoEndTime
				).toString(),
				mode === 'recording' ? ExportState.WaitingForRecord : ExportState.CapturingFrames
			)
		);

		// Sauvegarde les exports en cours
		await this.saveExports();
	}

	/**
	 * Sauvegarde les exports en cours.
	 */
	static async saveExports() {
		// S'assure que le dossier existe
		const exportsPath = await ProjectService.ensureFolder(this.exportFolder);

		// Construis le chemin d'accès vers le fichier contenant tout les exports
		const filePath = await join(exportsPath, `exports.json`);

		await writeTextFile(
			filePath,
			JSON.stringify(
				globalState.exportations.map((exp) => exp.toJSON()),
				null,
				2
			)
		);
	}

	static async loadExports() {
		const filePath = await join(await this.getExportFolder(), `exports.json`);

		if ((await exists(filePath)) === false) {
			// Aucun export trouvé
			globalState.exportations = [];
			return;
		}

		const json = await readTextFile(filePath);
		const data = JSON.parse(json);
		globalState.exportations = data.map((exp: any) => Exportation.fromJSON(exp));

		// Tout les exports en cours on les mets en canceled
		globalState.exportations.forEach((exp) => {
			if (exp.isOnGoing()) {
				exp.currentState = ExportState.Canceled;
			}
		});
	}

	static async deleteProjectFile(exportIdId: number) {
		const exportPath = await join(await appDataDir(), this.exportFolder);

		try {
			// Construis le chemin d'accès vers le projet
			const filePath = await join(exportPath, `${exportIdId}.json`);
			await remove(filePath);
		} catch (e) {}
	}

	static findExportById(id: number) {
		return globalState.exportations.find((exp) => exp.exportId === id);
	}

	static setupListener() {
		// Écoute les événements de progression d'export donné par Rust
		listen('export-progress-main', exportProgress);
	}

	static currentlyExportingProjects() {
		return globalState.exportations.filter((exp) => exp.isOnGoing());
	}
}

function exportProgress(event: any): void {
	const data = event.payload as ExportProgress;

	const exportation = globalState.exportations.find((exp) => exp.exportId === data.exportId);
	if (exportation) {
		exportation.percentageProgress = data.progress;
		exportation.currentState = data.currentState;
		exportation.currentTreatedTime = data.currentTime;

		if (data.errorLog) {
			exportation.errorLog = data.errorLog;
		}
	}

	ExportService.saveExports();
}

export interface ExportProgress {
	exportId: number;
	progress: number;
	currentState: ExportState;
	currentTime: number;
	errorLog?: string;
}

import { Project, ProjectContent, ProjectDetail } from '$lib/classes';
import { load } from '@tauri-apps/plugin-store';
import { readDir, remove } from '@tauri-apps/plugin-fs';
import { appDataDir, join } from '@tauri-apps/api/path';
import { exists } from '@tauri-apps/plugin-fs';
import { globalState } from '$lib/runes/main.svelte';

/**
 * Service pour gérer les projets.
 * Utilise JSONProjectStorage pour la persistance des données.
 */
export class ProjectService {
	private PROJECT_DETAIL_KEY: string = 'detail';
	private PROJECT_CONTENT_KEY: string = 'content';

	private projectsFolder: string = 'projects/';

	/**
	 * Sauvegarde un projet sur l'ordinateur
	 * @param project Le projet à sauver
	 */
	async save(project: Project) {
		// Construis le chemin d'accès vers le projet
		const filePath = await join(`${this.projectsFolder}${project.detail.id}.json`);

		// Enregistre le projet dans le stockage en séparant les détails du projet
		// et son contenu
		const store = await load(filePath, { autoSave: false });
		store.set(this.PROJECT_DETAIL_KEY, project.detail);
		store.set(this.PROJECT_CONTENT_KEY, project.content);
		await store.save();
	}

	/**
	 * Charge un projet complet depuis le stockage.
	 * @param projectId L'id du projet
	 * @returns Le projet
	 */
	async load(projectId: number): Promise<Project> {
		// Construis le chemin d'accès vers le projet
		const filePath = await join(`${this.projectsFolder}${projectId}.json`);

		// Charge le projet depuis le stockage
		const store = await load(filePath);
		const detailData = await store.get<any>(this.PROJECT_DETAIL_KEY);
		const contentData = await store.get<any>(this.PROJECT_CONTENT_KEY);

		if (!detailData || !contentData) {
			throw new Error(`Project with ID ${projectId} not found.`);
		}

		// Créer une vraie instance de ProjectDetail avec les données
		const detail = Object.assign(
			new ProjectDetail(detailData.name, detailData.reciter),
			detailData
		);
		// Reconstituer tous les objets complexes
		detail.reviveObjects();

		// Créer une vraie instance de ProjectContent avec les données
		const content = Object.assign(new ProjectContent(), contentData);

		return new Project(detail, content);
	}

	/**
	 * Charge uniquement les détails d'un projet.
	 * @param projectId L'id du projet
	 * @returns Les détails du projet
	 */
	async loadDetail(projectId: number): Promise<ProjectDetail> {
		// Construis le chemin d'accès vers le projet
		const filePath = await join(`${this.projectsFolder}${projectId}.json`);

		// Charge le projet depuis le stockage
		const store = await load(filePath);
		const detailData = await store.get<any>(this.PROJECT_DETAIL_KEY);

		if (!detailData) {
			throw new Error(`Project detail with ID ${projectId} not found.`);
		}
		// Créer une vraie instance de ProjectDetail avec les données
		const detail = Object.assign(
			new ProjectDetail(detailData.name, detailData.reciter),
			detailData
		);
		// Reconstituer tous les objets complexes
		detail.reviveObjects();
		return detail;
	}

	/**
	 * Supprime un projet de l'ordinateur.
	 * @param projectId L'id du projet à supprimer
	 */
	async delete(projectId: number): Promise<void> {
		const projectsPath = await join(await appDataDir(), this.projectsFolder);

		// Construis le chemin d'accès vers le projet
		const filePath = await join(projectsPath, `${projectId}.json`);

		await remove(filePath);
	}

	/**
	 * Récupère tous les détails des projets existants.
	 * Met à jour la liste des projets de l'utilisateur dans le globalState.
	 */
	async loadUserProjectsDetails() {
		try {
			// Récupère le chemin absolu vers le dossier contenant les projets
			const projectsPath = await join(await appDataDir(), this.projectsFolder);

			// Vérifie que le dossier existe
			if (!(await exists(projectsPath))) {
				// Si le dossier n'existe pas, c'est que l'utilisateur n'a
				// pas encore créer de projet
				return [];
			}

			// Récupère tout les fichiers projets
			const entries = await readDir(projectsPath);
			const projects: ProjectDetail[] = [];

			// Parcoure chaque fichier .json et charge le projet
			for (const entry of entries) {
				if (entry.isFile && entry.name.endsWith('.json')) {
					// Extraction de l'ID du nom de fichier (ex: "123.json" -> 123)
					const projectId = parseInt(entry.name.replace('.json', ''));

					if (!isNaN(projectId)) {
						try {
							// Charger le projet depuis le stockage
							// et récupérer les détails du projet
							const detail = await this.loadDetail(projectId);

							if (detail) {
								projects.push(detail);
							}
						} catch (error) {
							console.warn(`Impossible de charger le projet ${projectId}:`, error);
						}
					}
				}
			}

			// Trie les projets par date de création décroissante
			projects.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

			globalState.userProjectsDetails = projects;
		} catch (error) {
			return [];
		}
	}
}

// Instance singleton pour faciliter l'utilisation
export const projectService = new ProjectService();

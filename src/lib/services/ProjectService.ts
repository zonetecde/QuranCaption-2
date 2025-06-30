import { Project, ProjectContent, ProjectDetail } from '$lib/classes';
import { readDir, remove, writeTextFile, readTextFile, create, mkdir } from '@tauri-apps/plugin-fs';
import { appDataDir, join } from '@tauri-apps/api/path';
import { exists } from '@tauri-apps/plugin-fs';
import { globalState } from '$lib/runes/main.svelte';

/**
 * Service pour gérer les projets.
 * Utilise JSONProjectStorage pour la persistance des données.
 */
export class ProjectService {
	private projectsFolder: string = 'projects/';
	private assetsFolder: string = 'assets/';

	/**
	 * S'assure que le dossier des projets existe
	 */
	private async ensureProjectsFolder(): Promise<string> {
		const projectsPath = await join(await appDataDir(), this.projectsFolder);
		if (!(await exists(projectsPath))) {
			await mkdir(projectsPath, { recursive: true });
		}
		return projectsPath;
	}

	/**
	 * Sauvegarde un projet sur l'ordinateur
	 * @param project Le projet à sauver
	 */
	async save(project: Project) {
		// S'assure que le dossier existe
		const projectsPath = await this.ensureProjectsFolder();

		// Construis le chemin d'accès vers le projet
		const filePath = await join(projectsPath, `${project.detail.id}.json`);

		await writeTextFile(filePath, JSON.stringify(project.toJSON(), null, 2));
	}

	/**
	 * Sauvegarde les détails d'un projet.
	 * @param detail Les détails du projet à sauvegarder
	 */
	async saveDetail(detail: ProjectDetail): Promise<void> {
		// Récupère le projet complet
		const project = await this.load(detail.id);

		// Met à jour les détails du projet
		project.detail = detail;

		// Sauvegarde le projet complet
		await project.save();
	}

	/**
	 * Charge un projet complet depuis le stockage.
	 * @param projectId L'id du projet
	 * @param onlyDetail Si true, ne charge que les détails du projet
	 * @returns Le projet
	 */
	async load(projectId: number, onlyDetail: boolean = false): Promise<Project> {
		// S'assure que le dossier existe
		const projectsPath = await this.ensureProjectsFolder();

		// Construis le chemin d'accès vers le projet
		const filePath = await join(projectsPath, `${projectId}.json`);

		// Vérifie que le fichier existe
		if (!(await exists(filePath))) {
			throw new Error(`Project with ID ${projectId} not found.`);
		}

		// Lit le fichier JSON
		const fileContent = await readTextFile(filePath);
		const projectData = JSON.parse(fileContent);

		const detailData = projectData.detail;
		const contentData = projectData.content;

		if (!detailData || !contentData) {
			throw new Error(`Project with ID ${projectId} not found.`);
		}

		if (onlyDetail) {
			// Évite de charger le contenu du projet si on ne veut que les détails
			return new Project(ProjectDetail.fromJSON(detailData));
		}

		// Utilise la méthode fromJSON automatique pour récupérer l'instance correcte
		const project = Project.fromJSON(projectData);

		return project;
	}

	/**
	 * Charge uniquement les détails d'un projet.
	 * @param projectId L'id du projet
	 * @returns Les détails du projet
	 */
	async loadDetail(projectId: number): Promise<ProjectDetail> {
		return (await this.load(projectId, true)).detail;
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
							projects.push(await this.loadDetail(projectId));
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

	/**
	 * Récupère le chemin du dossier des assets téléchargés.
	 * @returns Le chemin du dossier des assets
	 */
	async getAssetFolder(): Promise<string> {
		return await join(await appDataDir(), this.assetsFolder);
	}
}

// Instance singleton pour faciliter l'utilisation
export const projectService = new ProjectService();

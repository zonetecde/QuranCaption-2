import { Project, ProjectContent, ProjectDetail } from '$lib/classes';
import { load } from '@tauri-apps/plugin-store';

// https://v2.tauri.app/fr/plugin/store/

export class JSONProjectStorage {
	private PROJECT_DETAIL_KEY: string = 'detail';
	private PROJECT_CONTENT_KEY: string = 'content';

	private projectsFolder: string = 'projects/';

	async save(project: Project) {
		// Construis le chemin d'accès vers le projet
		const filePath = `${this.projectsFolder}${project.id}.json`;

		// Enregistre le projet dans le stockage en séparant les détails du projet
		// et son contenu
		const store = await load(filePath);
		store.set(this.PROJECT_DETAIL_KEY, project.detail);
		store.set(this.PROJECT_CONTENT_KEY, project.content);
	}

	async load(projectId: number): Promise<Project> {
		// Construis le chemin d'accès vers le projet
		const filePath = `${this.projectsFolder}${projectId}.json`;

		// Charge le projet depuis le stockage
		const store = await load(filePath);
		const detail = await store.get<ProjectDetail>(this.PROJECT_DETAIL_KEY);
		const content = await store.get<ProjectContent>(this.PROJECT_CONTENT_KEY);

		if (!detail || !content) {
			throw new Error(`Project with ID ${projectId} not found.`);
		}

		return new Project(detail, content);
	}

	async delete(projectId: number): Promise<void> {
		// Construis le chemin d'accès vers le projet
		const filePath = `${this.projectsFolder}${projectId}.json`;

		// Supprime le fichier du stockage
		const store = await load(filePath);
		await store.clear();
	}
}

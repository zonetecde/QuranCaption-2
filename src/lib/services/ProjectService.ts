import { JSONProjectStorage } from './JSONProjectStorage.js';
import { Project, ProjectContent } from '../classes/index.js';

/**
 * Service pour gérer les projets.
 * Utilise JSONProjectStorage pour la persistance des données.
 */
export class ProjectService {
	private storage: JSONProjectStorage;

	constructor() {
		this.storage = new JSONProjectStorage();
	}

	async getProject(id: number): Promise<Project | undefined> {
		return await this.storage.load(id);
	}

	async createOrUpdateProject(project: Project): Promise<void> {
		await this.storage.save(project);
	}

	async deleteProject(id: number): Promise<void> {
		await this.storage.delete(id);
	}
}

// Instance singleton pour faciliter l'utilisation
export const projectService = new ProjectService();

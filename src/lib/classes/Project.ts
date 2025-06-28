import { projectService } from '$lib/services/ProjectService';
import { ProjectContent } from './ProjectContent.js';
import type { ProjectDetail } from './ProjectDetail.js';

export class Project {
	detail: ProjectDetail;
	content: ProjectContent;

	constructor(detail: ProjectDetail, content: ProjectContent = new ProjectContent()) {
		this.detail = detail;
		this.content = content;
	}

	/**
	 * Sauvegarde le projet sur l'ordinateur
	 */
	async save(): Promise<void> {
		this.detail.updateTimestamp();
		await projectService.save(this);
	}
}

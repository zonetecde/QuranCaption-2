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
	save(): void {
		this.detail.updateTimestamp();
		projectService.save(this);
	}
}

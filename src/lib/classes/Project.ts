import { Utilities } from './index.js';
import { ProjectContent } from './ProjectContent.js';
import type { ProjectDetail } from './ProjectDetail.js';

export class Project {
	id: number;
	detail: ProjectDetail;
	content: ProjectContent;

	constructor(detail: ProjectDetail, content: ProjectContent = new ProjectContent()) {
		this.id = Utilities.randomId();
		this.detail = detail;
		this.content = content;
	}

	updateTimestamp(): void {
		this.detail.updateTimestamp();
	}
}

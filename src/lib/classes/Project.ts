import { ProjectEditorState } from '$lib/runes/main.svelte.js';
import { projectService } from '$lib/services/ProjectService';
import { SerializableBase } from './misc/SerializableBase.js';
import { ProjectContent } from './ProjectContent.svelte.js';
import { ProjectDetail } from './ProjectDetail.svelte.js';

export class Project extends SerializableBase {
	detail: ProjectDetail;
	content: ProjectContent;
	projectEditorState: ProjectEditorState;

	constructor(detail: ProjectDetail, content: ProjectContent = new ProjectContent()) {
		super();
		this.detail = detail;
		this.content = content;
		this.projectEditorState = new ProjectEditorState();
	}

	/**
	 * Sauvegarde le projet sur l'ordinateur
	 */
	async save(): Promise<void> {
		this.detail.updateTimestamp();
		await projectService.save(this);
	}
}

// Enregistre les classes enfants pour la désérialisation automatique
SerializableBase.registerChildClass(Project, 'detail', ProjectDetail);
SerializableBase.registerChildClass(Project, 'content', ProjectContent);

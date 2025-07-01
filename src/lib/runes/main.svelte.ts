import type { Project, ProjectDetail } from '$lib/classes';
import { ProjectEditorTabs } from '$lib/classes/enums';
import { projectService } from '$lib/services/ProjectService';

class GlobalState {
	userProjectsDetails: ProjectDetail[] = $state([]); // Liste des détails des projets de l'utilisateur
	currentProject: Project | null = $state(null); // Projet actuellement sélectionné
	projectEditorState: ProjectEditorState = new ProjectEditorState();
}

class ProjectEditorState {
	currentTab: ProjectEditorTabs = $state(ProjectEditorTabs.VideoEditor);
	showDropScreen: boolean = $state(false);
}

export const globalState = new GlobalState();

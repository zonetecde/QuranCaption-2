import type { Project, ProjectDetail } from '$lib/classes';
import { projectService } from '$lib/services/ProjectService';

class GlobalState {
	userProjectsDetails: ProjectDetail[] = $state([]); // Liste des détails des projets de l'utilisateur
	currentProject: Project | undefined = $state(undefined); // Projet actuellement sélectionné
}

export const globalState = new GlobalState();

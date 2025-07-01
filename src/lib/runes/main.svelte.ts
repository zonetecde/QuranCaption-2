import type { Project, ProjectDetail } from '$lib/classes';
import { ProjectEditorTabs } from '$lib/classes/enums';
import { SerializableBase } from '$lib/classes/misc/SerializableBase';
import { projectService } from '$lib/services/ProjectService';

class GlobalState {
	userProjectsDetails: ProjectDetail[] = $state([]); // Liste des détails des projets de l'utilisateur
	currentProject: Project | null = $state(null); // Projet actuellement sélectionné
}

export const globalState = new GlobalState();

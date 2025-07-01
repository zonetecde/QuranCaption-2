import type { Project, ProjectDetail } from '$lib/classes';

class GlobalState {
	// Liste des détails des projets de l'utilisateur
	userProjectsDetails: ProjectDetail[] = $state([]);

	// Projet actuellement sélectionné
	currentProject: Project | null = $state(null);
}

export const globalState = new GlobalState();

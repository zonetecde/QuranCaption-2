import type { Edition, Project, ProjectDetail } from '$lib/classes';

class GlobalState {
	// Liste des détails des projets de l'utilisateur
	userProjectsDetails: ProjectDetail[] = $state([]);

	// Projet actuellement sélectionné
	currentProject: Project | null = $state(null);

	// Contient tout les traductions disponibles
	availableTranslations: Record<
		string,
		{
			flag: string;
			translations: Edition[];
		}
	> = $state({});

	// Cache pour le téléchargement des traductions
	caches = $state(new Map<string, string>());
}

export const globalState = new GlobalState();

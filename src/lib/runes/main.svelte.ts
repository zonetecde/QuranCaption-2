import type { Project, ProjectDetail } from '$lib/classes';
import type { Translation } from '$lib/classes/jsonDeserialization/Translation';

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
			translations: Translation[];
		}
	> = $state({});
}

export const globalState = new GlobalState();

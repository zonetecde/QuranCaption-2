import {
	SubtitleClip,
	TrackType,
	type Edition,
	type Project,
	type ProjectDetail,
	type PredefinedSubtitleClip
} from '$lib/classes';

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
			basmala: string;
			istiadhah: string;
			translations: Edition[];
		}
	> = $state({});

	// Cache pour le téléchargement des traductions
	caches = $state(new Map<string, string>());

	// ==========================================
	// Shortcut pour le projet actuel
	//==========================================

	get getSubtitleTrack() {
		return this.currentProject!.content.timeline.getFirstTrack(TrackType.Subtitle)!;
	}

	get getAudioTrack() {
		return this.currentProject!.content.timeline.getFirstTrack(TrackType.Audio)!;
	}

	get getVideoTrack() {
		return this.currentProject!.content.timeline.getFirstTrack(TrackType.Video)!;
	}

	get getSubtitleClips(): SubtitleClip[] {
		const clips = this.getSubtitleTrack.clips;
		return clips.filter((clip) => clip.type === 'Subtitle') as SubtitleClip[];
	}

	get getPredefinedSubtitleClips(): PredefinedSubtitleClip[] {
		const clips = this.getSubtitleTrack.clips;
		return clips.filter((clip) => clip.type === 'Pre-defined Subtitle') as PredefinedSubtitleClip[];
	}
}

export const globalState = new GlobalState();

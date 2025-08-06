import {
	SubtitleClip,
	TrackType,
	type Edition,
	type Project,
	type ProjectDetail,
	type PredefinedSubtitleClip,
	ProjectTranslation
} from '$lib/classes';
import type { AssetTrack, SubtitleTrack } from '$lib/classes/Track.svelte';

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
		return this.currentProject!.content.timeline.getFirstTrack(
			TrackType.Subtitle
		)! as SubtitleTrack;
	}

	get getAudioTrack() {
		return this.currentProject!.content.timeline.getFirstTrack(TrackType.Audio)! as AssetTrack;
	}

	get getVideoTrack() {
		return this.currentProject!.content.timeline.getFirstTrack(TrackType.Video)! as AssetTrack;
	}

	get getSubtitleClips(): SubtitleClip[] {
		const clips = this.getSubtitleTrack.clips;
		return clips.filter((clip) => clip.type === 'Subtitle') as SubtitleClip[];
	}

	get getPredefinedSubtitleClips(): PredefinedSubtitleClip[] {
		const clips = this.getSubtitleTrack.clips;
		return clips.filter((clip) => clip.type === 'Pre-defined Subtitle') as PredefinedSubtitleClip[];
	}

	get getProjectTranslation(): ProjectTranslation {
		return this.currentProject!.content.projectTranslation;
	}

	get getTranslationsState() {
		return this.currentProject!.projectEditorState.translationsEditor;
	}

	get getVideoStyle() {
		return this.currentProject!.content.videoStyle;
	}

	get getSectionsState() {
		return this.currentProject!.projectEditorState.sections;
	}

	get getStylesState() {
		return this.currentProject!.projectEditorState.stylesEditor;
	}
}

export const globalState = new GlobalState();

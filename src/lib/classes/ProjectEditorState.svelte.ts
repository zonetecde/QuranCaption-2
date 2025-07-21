import { ProjectEditorTabs } from './enums';
import { SerializableBase } from './misc/SerializableBase';

/**
 * État de l'éditeur de projet, utilisé pour gérer l'interface utilisateur et les interactions
 * dans l'éditeur de projet.
 */
export class ProjectEditorState extends SerializableBase {
	// L'onglet actuellement sélectionné dans l'éditeur de projet
	currentTab: ProjectEditorTabs = $state(ProjectEditorTabs.VideoEditor);

	// Indique si on montre ou non l'indication "Drop your files here"
	showDropScreen: boolean = $state(false);

	// Indique quelle(s) section(s) de l'éditeur sont étendues
	sections: {
		[name: string]: {
			extended: boolean;
		};
	} = $state({});

	// Timeline
	timeline: TimelineState = $state(new TimelineState());

	// Video preview
	videoPreview: VideoPreviewState = $state(new VideoPreviewState());
}

/**
 * État de la timeline dans l'éditeur de projet.
 */
export class TimelineState extends SerializableBase {
	// Niveau de zoom de la timeline
	zoom: number = $state(29.25);

	// Position du curseur dans la timeline
	cursorPosition: number = $state(0);

	// State permettant de trigger le changement du temps de la vidéo et de l'audio dans la preview
	movePreviewTo: number = $state(0);

	// Position du scroll
	scrollX: number = $state(0);

	// On montre ou non les wavesforms
	showWaveforms: boolean = $state(false);
}

/**
 * État de la prévisualisation vidéo dans l'éditeur de projet.
 */
export class VideoPreviewState extends SerializableBase {
	// Indique si la prévisualisation vidéo est en pause
	isPlaying: boolean = $state(false);

	// Hauteur de la video preview par rapport à la timeline
	videoPreviewHeight: number = $state(72.5);
}

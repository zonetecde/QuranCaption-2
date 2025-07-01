import { Timeline } from './Timeline.js';
import { Asset } from './Asset.js';
import { ProjectSettings } from './ProjectSettings.js';
import { SubtitleTrack, Track } from './Track.js';
import { TrackType } from './enums.js';
import { SerializableBase } from './misc/SerializableBase.js';

export class ProjectContent extends SerializableBase {
	timeline: Timeline;
	assets: Asset[];
	projectSettings: ProjectSettings;

	constructor(
		timeline: Timeline = new Timeline(),
		assets: Asset[] = [],
		projectSettings: ProjectSettings = new ProjectSettings()
	) {
		super();

		this.timeline = $state(timeline);
		this.assets = $state(assets);
		this.projectSettings = $state(projectSettings);
	}

	static getDefaultProjectContent(): ProjectContent {
		return new ProjectContent(
			new Timeline([
				new SubtitleTrack('arabic'),
				new Track(TrackType.Video),
				new Track(TrackType.Audio)
			]),
			[],
			ProjectSettings.getDefaultProjectSettings()
		);
	}
}

// Enregistre les classes enfants pour la désérialisation automatique
SerializableBase.registerChildClass(ProjectContent, 'timeline', Timeline);
SerializableBase.registerChildClass(ProjectContent, 'assets', Asset);
SerializableBase.registerChildClass(ProjectContent, 'projectSettings', ProjectSettings);

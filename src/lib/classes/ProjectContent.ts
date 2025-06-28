import { Timeline } from './Timeline.js';
import { Asset } from './Asset.js';
import { ProjectSettings } from './ProjectSettings.js';
import { SubtitleTrack, Track } from './Track.js';
import { TrackType } from './enums.js';

export class ProjectContent {
	timeline: Timeline;
	assets: Asset[];
	projectSettings: ProjectSettings;

	constructor(
		timeline: Timeline = new Timeline(),
		assets: Asset[] = [],
		projectSettings: ProjectSettings = new ProjectSettings()
	) {
		this.timeline = timeline;
		this.assets = assets;
		this.projectSettings = projectSettings;
	}

	static getDefaultProjectContent(): ProjectContent {
		return {
			timeline: new Timeline([
				new SubtitleTrack('arabic'),
				new Track(TrackType.Video),
				new Track(TrackType.Audio)
			]),
			assets: [],
			projectSettings: ProjectSettings.getDefaultProjectSettings()
		};
	}
}

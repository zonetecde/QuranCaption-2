import { Timeline } from './Timeline.js';
import { Asset } from './Asset.js';
import { ProjectSettings } from './ProjectSettings.js';
import { SubtitleTrack, Track } from './Track.js';
import { AssetType, TrackType } from './enums.js';
import { SerializableBase } from './misc/SerializableBase.js';
import toast from 'svelte-5-french-toast';

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

	addAsset(filePath: string, youtubeUrl?: string): void {
		const asset = new Asset(filePath, youtubeUrl);
		if (asset.type === AssetType.Unknown) {
			toast.error('This file format is not supported.');
			return;
		}
		this.assets.push(asset);
	}
}

// Enregistre les classes enfants pour la désérialisation automatique
SerializableBase.registerChildClass(ProjectContent, 'timeline', Timeline);
SerializableBase.registerChildClass(ProjectContent, 'assets', Asset);
SerializableBase.registerChildClass(ProjectContent, 'projectSettings', ProjectSettings);

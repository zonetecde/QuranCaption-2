import { AssetType, TrackType } from './enums.js';
import { Clip } from './Clip.js';
import { SerializableBase } from './misc/SerializableBase.js';

export class Track extends SerializableBase {
	type: TrackType;
	clips: Clip[];

	constructor(type: TrackType) {
		super();
		this.type = type;
		this.clips = [];
	}

	getName(): string {
		switch (this.type) {
			case TrackType.Video:
				return 'Video';
			case TrackType.Audio:
				return 'Audio';
			case TrackType.Subtitle:
				return 'Subtitles';
			default:
				return 'Unknown Track';
		}
	}

	getIcon(): string {
		switch (this.type) {
			case TrackType.Video:
				return 'movie';
			case TrackType.Audio:
				return 'music_note';
			case TrackType.Subtitle:
				return 'subtitles';
			default:
				return 'help_outline';
		}
	}

	getAcceptableAssetType(): AssetType {
		switch (this.type) {
			case TrackType.Video:
				return AssetType.Video;
			case TrackType.Audio:
				return AssetType.Audio;
			default:
				return AssetType.Unknown;
		}
	}
}

export class SubtitleTrack extends Track {
	language: string;

	constructor(language: string) {
		super(TrackType.Subtitle);
		this.language = language;
	}
}

// Enregistre les classes enfants pour la désérialisation automatique
SerializableBase.registerChildClass(Track, 'clips', Clip);
SerializableBase.registerChildClass(SubtitleTrack, 'clips', Clip);

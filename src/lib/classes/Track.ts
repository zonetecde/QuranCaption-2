import { TrackType } from './enums.js';
import { Clip } from './Clip.js';

export class Track {
	type: TrackType;
	clips: Clip[];

	constructor(type: TrackType) {
		this.type = type;
		this.clips = [];
	}
}

export class SubtitleTrack extends Track {
	language: string;

	constructor(language: string) {
		super(TrackType.Subtitle);
		this.language = language;
	}
}

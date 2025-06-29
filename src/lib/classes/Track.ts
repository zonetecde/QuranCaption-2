import { TrackType } from './enums.js';
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

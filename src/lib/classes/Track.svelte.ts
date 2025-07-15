import { AssetType, TrackType } from './enums.js';
import { AssetClip, Clip } from './Clip.js';
import { SerializableBase } from './misc/SerializableBase.js';
import type { Asset } from './index.js';

export class Track extends SerializableBase {
	type: TrackType = $state(TrackType.Unknown);
	clips: Clip[] = $state([]);

	constructor(type: TrackType) {
		super();
		this.type = type;
		this.clips = [];
	}

	addAsset(asset: Asset) {
		// Récupère le dernier clip de la piste, s'il existe
		const lastClip = this.clips.length > 0 ? this.clips[this.clips.length - 1] : null;

		if (lastClip)
			this.clips.push(
				new AssetClip(lastClip.endTime + 1, lastClip.endTime + asset.duration.ms + 1, asset.id)
			);
		else this.clips.push(new AssetClip(0, asset.duration.ms, asset.id));

		console.log(
			`Added asset ${asset.fileName} to track ${this.getName()} at time ${this.clips[this.clips.length - 1].startTime}`
		);
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

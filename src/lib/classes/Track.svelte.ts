import { AssetType, TrackType } from './enums.js';
import { AssetClip, Clip } from './Clip.js';
import { SerializableBase } from './misc/SerializableBase.js';
import { Duration, type Asset } from './index.js';
import { globalState } from '$lib/runes/main.svelte.js';

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

		// Trigger la réactivé dans la videopreview pour afficher le clip ajouté (si le curseur est dessus)
		setTimeout(() => {
			globalState.currentProject!.projectEditorState.timeline.movePreviewTo =
				globalState.currentProject!.projectEditorState.timeline.cursorPosition + 1;
		}, 0);
	}

	removeClip(id: number) {
		const index = this.clips.findIndex((clip) => clip.id === id);
		if (index !== -1) {
			this.clips.splice(index, 1);
			// Met à jour les timestamps des clips suivants
			for (let i = index; i < this.clips.length; i++) {
				const clip = this.clips[i];
				clip.startTime = i === 0 ? 0 : this.clips[i - 1].endTime + 1;
				clip.endTime = clip.startTime + clip.duration;
			}
		}
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

	getPixelPerSecond() {
		return globalState.currentProject?.projectEditorState.timeline.zoom!;
	}

	getDuration(): Duration {
		if (this.clips.length === 0) {
			return new Duration(0);
		}
		return new Duration(Math.max(...this.clips.map((clip) => clip.endTime)));
	}

	getCurrentClip(): Clip | null {
		const currentTime = globalState.currentProject?.projectEditorState.timeline.cursorPosition ?? 0;

		for (let index = 0; index < this.clips.length; index++) {
			const element = this.clips[index];
			if (currentTime >= element.startTime && currentTime <= element.endTime) {
				return element;
			}
		}

		return null;
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

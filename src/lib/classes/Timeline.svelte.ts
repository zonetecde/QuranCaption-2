import { Asset, AssetClip, Duration, TrackType } from './index.js';
import { SerializableBase } from './misc/SerializableBase.js';
import { Track } from './Track.svelte.js';

export class Timeline extends SerializableBase {
	tracks: Track[] = $state([]);

	constructor(tracks: Track[] = []) {
		super();
		this.tracks = tracks;
	}

	addAssetToTrack(trackType: string, asset: any): void {
		const track = this.tracks.find((t) => t.type === trackType);
		if (track) {
			track.addAsset(asset);
		} else {
			console.error(`Track of type ${trackType} not found.`);
		}
	}

	getLongestTrackDuration(): Duration {
		return new Duration(Math.max(...this.tracks.map((track) => track.getDuration().ms)));
	}

	removeAssetFromTracks(asset: Asset) {
		this.tracks.forEach((track) => {
			if (track.type === TrackType.Audio || track.type === TrackType.Video) {
				for (let i = track.clips.length - 1; i >= 0; i--) {
					const clip = track.clips[i];

					if (clip && (clip as AssetClip).assetId === asset.id) {
						track.removeClip(clip.id);
					}
				}
			}
		});
	}
}

// Enregistre les classes enfants pour la désérialisation automatique
SerializableBase.registerChildClass(Timeline, 'tracks', Track);

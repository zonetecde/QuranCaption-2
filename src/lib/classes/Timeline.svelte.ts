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
}

// Enregistre les classes enfants pour la désérialisation automatique
SerializableBase.registerChildClass(Timeline, 'tracks', Track);

import { SerializableBase } from './misc/SerializableBase.js';
import { Track } from './Track.js';

export class Timeline extends SerializableBase {
	tracks: Track[];

	constructor(tracks: Track[] = []) {
		super();
		this.tracks = tracks;
	}
}

// Enregistre les classes enfants pour la désérialisation automatique
SerializableBase.registerChildClass(Timeline, 'tracks', Track);

import { Track } from './Track.js';

export class Timeline {
	tracks: Track[];

	constructor(tracks: Track[] = []) {
		this.tracks = tracks;
	}
}

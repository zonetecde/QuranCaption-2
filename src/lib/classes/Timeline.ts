export default interface Timeline {
	audiosTracks: Track[];
	videosTracks: Track[];
	subtitlesTracks: Track[];
}

export type Track = {
	id: string;
	name: string;
	type: 'Video track' | 'Audio track' | 'Subtitles track';
	clips: Clip[];
};

export type Clip = {
	id: string;
	start: number;
	end: number;
	duration: number;
	assetId: string;
	fileStartTime: number;
	fileEndTime: number;
};

export function secondsToMMSS(seconds: number): string {
	if (seconds < 60) return seconds.toString();

	const date = new Date(0);
	date.setSeconds(seconds);
	const str = date.toISOString().substr(14, 5);

	// Remove leading 0
	if (str.startsWith('0')) return str.substr(1);

	return str;
}

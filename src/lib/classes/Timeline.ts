export default interface Timeline {
	audiosTracks: AudioTrack[];
	videosTracks: VideoTrack[];
	subtitlesTracks: SubtitleTrack[];
}

export type AudioTrack = {
	id: string;
	name: string;
	clips: AudioClip[];
};

export type AudioClip = {
	id: string;
	start: number;
	end: number;
	audioId: string;
	fileStartTime: number;
	fileEndTime: number;
};

export type VideoTrack = {
	id: string;
	name: string;
	clips: VideoClip[];
};

export type VideoClip = {
	id: string;
	start: number;
	end: number;
	videoId: string;
	fileStartTime: number;
	fileEndTime: number;
};

export type SubtitleTrack = {
	id: string;
	name: string;
	clips: SubtitleClip[];
};

export type SubtitleClip = {
	id: string;
	start: number;
	end: number;
	subtitleId: string;
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

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
};

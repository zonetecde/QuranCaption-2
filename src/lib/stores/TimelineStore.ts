import type Asset from '$lib/models/Asset';
import { get, writable, type Writable } from 'svelte/store';
import { currentProject } from './ProjectStore';
import type Timeline from '$lib/models/Timeline';

export const zoom: Writable<number> = writable(30); // 30 px per second
export const cursorPosition: Writable<number> = writable(0); // in milliseconds, current moment in the timeline / video preview
export const forceUpdateCurrentPlayingMedia: Writable<boolean> = writable(false);
export const scrollPosition: Writable<number> = writable(0);

export function getTimelineTotalDuration(timeline: Timeline) {
	const tracks = [...timeline.videosTracks, ...timeline.audiosTracks, ...timeline.subtitlesTracks];
	let maxEnd =
		tracks.reduce((max, track) => {
			return Math.max(
				max,
				// Does not take into account the black video
				track.clips.length === 0
					? 0
					: track.clips[track.clips.length - 1].id === 'black-video'
						? 0
						: track.clips[track.clips.length - 1].end
			);
		}, 0) / 1000;

	const marge = 120;

	if (maxEnd < 360) maxEnd = 360 - marge; // 6 minutes per default

	return maxEnd + marge;
}

export function getLastClipEnd(timeline: Timeline) {
	const tracks = [...timeline.videosTracks, ...timeline.audiosTracks, ...timeline.subtitlesTracks];
	let maxEnd =
		tracks.reduce((max, track) => {
			return Math.max(
				max,
				track.clips.length === 0
					? 0
					: track.clips[track.clips.length - 1].id === 'black-video'
						? 0
						: track.clips[track.clips.length - 1].end
			);
		}, 0) / 1000;

	return maxEnd;
}

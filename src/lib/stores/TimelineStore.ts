import type Timeline from '$lib/models/Timeline';
import { get, writable, type Writable } from 'svelte/store';
import { currentProject } from './ProjectStore';
import { endTime } from './ExportStore';

export const zoom: Writable<number> = writable(30); // 30 px per second
export const cursorPosition: Writable<number> = writable(0); // in milliseconds, current moment in the timeline / video preview
export const forceUpdateCurrentPlayingMedia: Writable<boolean> = writable(false);
export const scrollPosition: Writable<number> = writable(0);

export function getTimelineTotalDuration(): number {
	const timeline = get(currentProject).timeline;
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

export function getVideoDurationInMs(): number {
	const timeline = get(currentProject).timeline;
	const tracks = [...timeline.videosTracks, ...timeline.audiosTracks];
	let maxEnd = tracks.reduce((max, track) => {
		return Math.max(
			max,
			// Does not take into account the black video
			track.clips.length === 0
				? 0
				: track.clips[track.clips.length - 1].id === 'black-video'
					? 0
					: track.clips[track.clips.length - 1].end
		);
	}, 0);

	if (maxEnd === 0) {
		// retourne le endtime du dernier subtitle clip
		if (timeline.subtitlesTracks.length === 0) return 0;
		maxEnd = timeline.subtitlesTracks[0].clips[timeline.subtitlesTracks[0].clips.length - 1].end;
	}

	return maxEnd;
}

export async function scrollToCursor() {
	// wait for the UI to update
	await new Promise((resolve) => setTimeout(resolve, 0));

	const element = document.getElementById('cursor');
	const timeline = document.getElementById('timeline');

	if (element && timeline) {
		const oldScrollLeft = timeline.scrollLeft;
		// scroll the timeline to X=0
		timeline.scrollLeft = 0;

		// get the position of the cursor relative to the timeline
		const cursorPositionRelativeToTimeline =
			element.getBoundingClientRect().left - timeline.getBoundingClientRect().left;

		const newScrollLeftPos = cursorPositionRelativeToTimeline - window.innerWidth / 2 + 300;

		// scroll the timeline to the cursor smoothly
		timeline.scrollTo({
			left: newScrollLeftPos
		});
	}
}

export function getLastClipEnd(timeline: Timeline) {
	const tracks = [...timeline.videosTracks, ...timeline.audiosTracks, ...timeline.subtitlesTracks];
	const maxEnd =
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

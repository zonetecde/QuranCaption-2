import type Timeline from '$lib/classes/Timeline';
import { writable, type Writable } from 'svelte/store';

export const timeline: Writable<Timeline> = writable({
	audiosTracks: [],
	videosTracks: [],
	subtitlesTracks: []
});

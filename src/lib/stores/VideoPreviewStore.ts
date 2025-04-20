import { writable, type Writable } from 'svelte/store';

export const isPreviewPlaying: Writable<boolean> = writable(false);

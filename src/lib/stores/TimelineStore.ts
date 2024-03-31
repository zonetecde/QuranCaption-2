import { writable, type Writable } from 'svelte/store';

export const zoom: Writable<number> = writable(30); // 30 px per second

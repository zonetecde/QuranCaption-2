import { writable, type Writable } from 'svelte/store';

export const isCtrlPressed: Writable<boolean> = writable(false);

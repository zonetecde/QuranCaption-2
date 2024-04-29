import type Asset from '$lib/classes/Asset';
import { writable, type Writable } from 'svelte/store';

export const draggedAssetId: Writable<string | undefined> = writable(undefined);
export const zoom: Writable<number> = writable(30); // 30 px per second

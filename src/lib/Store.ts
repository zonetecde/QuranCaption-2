import { writable, type Writable } from 'svelte/store';
import type Asset from './classes/Asset';
import { getFileNameFromPath, getFileType } from './FileExt';

export const assets: Writable<Asset[]> = writable([]);

/**
 * Add videos to the store and remove duplicates
 * @param filePaths - The file names to add
 */
export function addAssets(filePaths: string | string[]) {
	let _assets: Asset[] = [];
	let _filePaths: string[];

	// Convert to array if not already
	if (Array.isArray(filePaths)) {
		_filePaths = filePaths;
	} else {
		_filePaths = [filePaths];
	}

	// Add to clips
	_filePaths.forEach((filePath) => {
		if (filePath === '') return;
		const fileType = getFileType(filePath);
		if (fileType === 'unknown') return;

		_assets.push({
			fileName: getFileNameFromPath(filePath),
			filePath: filePath,
			type: fileType
		});
	});

	assets.update((v) => [...v, ..._assets]);

	// Remove duplicates
	assets.update((v) => {
		return v.filter((clip, index, self) => {
			return index === self.findIndex((c) => c.filePath === clip.filePath);
		});
	});
}

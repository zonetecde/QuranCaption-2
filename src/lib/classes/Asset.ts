import Id from '$lib/ext/Id';
import { getFileNameFromPath, getFileType } from '$lib/FileExt';
import { currentProject } from '$lib/stores/ProjectStore';

export default interface Asset {
	fileName: string;
	filePath: string;
	type: 'audio' | 'video' | 'image' | 'unknown';
	id: string;
}

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
			type: fileType,
			id: Id.generate()
		});
	});

	currentProject.update((v) => {
		v.assets = [...v.assets, ..._assets];
		return v;
	});

	// Remove duplicates
	currentProject.update((v) => {
		v.assets = v.assets.filter(
			(asset, index, self) => self.findIndex((t) => t.filePath === asset.filePath) === index
		);
		return v;
	});
}

export function removeAsset(id: string) {
	currentProject.update((v) => {
		v.assets = v.assets.filter((asset) => asset.id !== id);
		return v;
	});
}

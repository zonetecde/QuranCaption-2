import { getFileNameFromPath, getFileType } from '$lib/ext/File';
import Id from '$lib/ext/Id';
import { currentProject } from '$lib/stores/ProjectStore';
import { invoke } from '@tauri-apps/api';

export default interface Asset {
	fileName: string;
	filePath: string;
	type: 'audio' | 'video' | 'image' | 'unknown';
	id: string;
	duration: number; // In milliseconds
}

/**
 * Add videos to the store and remove duplicates
 * @param filePaths - The file names to add
 */
export async function addAssets(filePaths: string | string[]) {
	let _assets: Asset[] = [];
	let _filePaths: string[];

	// Convert to array if not already
	if (Array.isArray(filePaths)) {
		_filePaths = filePaths;
	} else {
		_filePaths = [filePaths];
	}

	// Add to clips
	await Promise.all(
		_filePaths.map(async (filePath) => {
			if (filePath === '') return;
			const fileType = getFileType(filePath);
			if (fileType === 'unknown') return;

			// If it is a video, get its duration
			let duration = 5000;
			if (fileType === 'video' || fileType === 'audio') {
				try {
					const result = await invoke('get_video_duration', { path: filePath });
					if (typeof result === 'number') duration = result as number;
				} catch (e) {
					console.error(e);
				}
			}

			_assets.push({
				fileName: getFileNameFromPath(filePath),
				filePath: filePath,
				type: fileType,
				duration: duration,
				id: Id.generate()
			});
		})
	);

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

	console.log(_assets);
}

export function removeAsset(id: string) {
	currentProject.update((v) => {
		v.assets = v.assets.filter((asset) => asset.id !== id);
		return v;
	});
}

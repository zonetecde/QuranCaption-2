import { getFileNameFromPath, getFileType } from '$lib/ext/File';
import Id from '$lib/ext/Id';
import { currentProject } from '$lib/stores/ProjectStore';
import { invoke } from '@tauri-apps/api';
import { get } from 'svelte/store';

export default interface Asset {
	fileName: string;
	filePath: string;
	type: 'audio' | 'video' | 'image' | 'unknown';
	id: string;
	duration: number; // In milliseconds
	exist: boolean; // If the file exists (to relocate asset)
	youtubeUrl?: string;
}

export async function downloadFromYoutube(
	fileName: string,
	downloadFolder: string,
	youtubeUrl: string,
	videoFormat: string,
	addToProject: boolean
) {
	await invoke('download_youtube_video', {
		format: videoFormat,
		url: youtubeUrl,
		path: downloadFolder + '/' + fileName
	}),
		{
			loading: 'Downloading ' + (videoFormat === 'webm' ? 'audio' : 'video') + ' from youtube...',
			success: 'Download completed !',
			error: 'An error occured while downloading the video'
		};

	if (addToProject) await addAssets([downloadFolder + '/' + fileName], youtubeUrl);
}

/**
 * Add videos to the store and remove duplicates
 * @param filePaths - The file names to add
 */
export async function addAssets(filePaths: string | string[], youtubeUrl?: string) {
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
			let duration = 3600 * 1000; // Default duration is 1 hour (for images)
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
				id: Id.generate(),
				exist: true,
				youtubeUrl: youtubeUrl
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
}

export function removeAsset(id: string) {
	currentProject.update((v) => {
		v.assets = v.assets.filter((asset) => asset.id !== id);

		v.timeline.videosTracks.forEach((track) => {
			track.clips = track.clips.filter((clip) => clip.assetId !== id);
		});

		v.timeline.audiosTracks.forEach((track) => {
			track.clips = track.clips.filter((clip) => clip.assetId !== id);
		});

		if (v.timeline.videosTracks[0].clips.length === 0) {
			// Add the default black video if there are no videos
			v.timeline.videosTracks[0].clips.push({
				id: 'black-video',
				start: 0,
				duration: 7200000,
				end: 7200000,
				assetId: 'black-video',
				fileStartTime: 0,
				fileEndTime: 7200000,
				isMuted: false
			});
		}

		return v;
	});
}

export function getAssetFromId(id: string): Asset | undefined {
	if (id === 'black-video') {
		return {
			fileName: 'black-video',
			filePath: './black-vid.mp4',
			type: 'video',
			id: 'black-video',
			duration: 7200000,
			exist: true
		};
	}

	const asset = get(currentProject).assets.find((a: Asset) => a.id === id);
	if (asset) return asset;
	return undefined;
}

import type Asset from '$lib/models/Asset';
import type Project from '$lib/models/Project';
import { currentProject } from '$lib/stores/ProjectStore';
import { get } from 'svelte/store';

export default class Id {
	static generate() {
		const s4 = () =>
			Math.floor((1 + Math.random()) * 0x10000)
				.toString(16)
				.substring(1);

		return `${s4()}${s4()}-${s4()}-${s4()}-${s4()}-${s4()}${s4()}${s4()}`;
	}
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

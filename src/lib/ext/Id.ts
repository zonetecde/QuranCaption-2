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
	if (id === 'black-screen') {
		return {
			fileName: 'Black Screen',
			filePath: 'black.jpg',
			type: 'image',
			id: 'black-screen',
			duration: 0,
			exist: true
		};
	}

	const asset = get(currentProject).assets.find((a: Asset) => a.id === id);
	if (asset) return asset;
	return undefined;
}

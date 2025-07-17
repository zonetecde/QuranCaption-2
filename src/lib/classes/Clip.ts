import { globalState } from '$lib/runes/main.svelte';
import type { Asset } from './Asset.svelte';
import { SerializableBase } from './misc/SerializableBase';
import { Utilities } from './misc/Utilities';
import type { Track } from './Track.svelte';

export class Clip extends SerializableBase {
	id: number;
	startTime: number;
	endTime: number;
	duration: number;

	constructor(startTime: number, endTime: number) {
		super();
		this.id = Utilities.randomId();
		this.startTime = startTime;
		this.endTime = endTime;
		this.duration = endTime - startTime;
	}

	getWidth() {
		return (this.duration / 1000) * globalState.currentProject?.projectEditorState.timeline.zoom!;
	}
}

export class AssetClip extends Clip {
	assetId: number;

	constructor(startTime: number, endTime: number, assetId: number) {
		super(startTime, endTime);
		this.assetId = assetId;
	}
}

export class SubtitleClip extends Clip {
	surah: number;
	verse: number;
	startWordIndex: number;
	endWordIndex: number;
	translations: { [key: string]: string };

	constructor(
		startTime: number,
		endTime: number,
		surah: number,
		verse: number,
		startWordIndex: number,
		endWordIndex: number,
		translations: { [key: string]: string } = {}
	) {
		super(startTime, endTime);
		this.surah = surah;
		this.verse = verse;
		this.startWordIndex = startWordIndex;
		this.endWordIndex = endWordIndex;
		this.translations = translations;
	}
}

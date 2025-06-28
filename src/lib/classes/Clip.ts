export class Clip {
	id: number;
	startTime: number;
	endTime: number;
	duration: number;

	constructor(startTime: number, endTime: number) {
		this.id = Utilities.randomId();
		this.startTime = startTime;
		this.endTime = endTime;
		this.duration = endTime - startTime;
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

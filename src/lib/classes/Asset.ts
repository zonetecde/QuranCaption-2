import { AssetType } from './enums.js';

export class Asset {
	id: number;
	fileName: string;
	filePath: string;
	type: AssetType;
	duration: number;
	fromYoutube: boolean;
	youtubeUrl?: string;

	constructor(
		fileName: string,
		filePath: string,
		type: AssetType,
		duration: number,
		fromYoutube: boolean = false,
		youtubeUrl?: string
	) {
		this.id = Utilities.randomId();
		this.fileName = fileName;
		this.filePath = filePath;
		this.type = type;
		this.duration = duration;
		this.fromYoutube = fromYoutube;
		this.youtubeUrl = youtubeUrl;
	}
}

import { Duration } from './Duration.js';
import { AssetType } from './enums.js';
import { SerializableBase } from './misc/SerializableBase.js';
import { Utilities } from './misc/Utilities.js';

export class Asset extends SerializableBase {
	id: number;
	fileName: string;
	filePath: string;
	type: AssetType;
	duration: Duration;
	fromYoutube: boolean;
	youtubeUrl?: string;

	constructor(
		fileName: string,
		filePath: string,
		type: AssetType,
		duration: Duration,
		fromYoutube: boolean = false,
		youtubeUrl?: string
	) {
		super();
		this.id = Utilities.randomId();
		this.fileName = fileName;
		this.filePath = filePath;
		this.type = type;
		this.duration = duration;
		this.fromYoutube = fromYoutube;
		this.youtubeUrl = youtubeUrl;
	}
}

// Enregistre les classes enfants pour la désérialisation automatique
SerializableBase.registerChildClass(Asset, 'duration', Duration);

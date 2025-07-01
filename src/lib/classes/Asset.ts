import { invoke } from '@tauri-apps/api/core';
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

	constructor(filePath: string = '', youtubeUrl?: string) {
		super();
		this.id = Utilities.randomId();

		this.filePath = filePath;

		if (youtubeUrl) {
			this.youtubeUrl = youtubeUrl;
			this.fromYoutube = true;
		} else {
			this.fromYoutube = false;
		}

		// Si l'arg est undefined (cas de désérialisation)
		if (filePath) {
			const fileName = this.getFileName(filePath);
			this.fileName = fileName;

			const extension = this.getFileExtension(fileName);
			this.type = this.getAssetType(extension);

			this.duration = new Duration(0);

			if (this.type === AssetType.Audio || this.type === AssetType.Video) {
				this.initializeDuration();
			}
		} else {
			// Valeurs par défaut pour la désérialisation
			this.fileName = '';
			this.type = AssetType.Unknown;
			this.duration = new Duration(0);
		}
	}

	async initializeDuration() {
		this.duration = new Duration(
			(await invoke('get_duration', { filePath: this.filePath })) as number
		);
	}

	private getFileName(filePath: string): string {
		const parts = filePath.split('/');
		if (parts.length === 0) {
			// split with backslashes for Windows paths
			const backslashParts = filePath.split('\\');
			return backslashParts.length > 0 ? backslashParts[backslashParts.length - 1] : '';
		}
		return parts.length > 0 ? parts[parts.length - 1] : '';
	}

	private getFileExtension(fileName: string): string {
		const parts = fileName.split('.');
		if (parts.length > 1) {
			return parts[parts.length - 1].toLowerCase();
		}
		return '';
	}

	private getAssetType(extension: string): AssetType {
		switch (extension) {
			case 'mp4':
			case 'avi':
			case 'mov':
			case 'mkv':
			case 'flv':
			case 'webm':
				return AssetType.Video;
			case 'mp3':
			case 'aac':
			case 'ogg':
			case 'flac':
			case 'm4a':
			case 'opus':
			case 'wav':
				return AssetType.Audio;
			case 'png':
			case 'jpg':
			case 'jpeg':
			case 'gif':
			case 'bmp':
			case 'webp':
				return AssetType.Image;
			default:
				return AssetType.Unknown;
		}
	}
}

// Enregistre les classes enfants pour la désérialisation automatique
SerializableBase.registerChildClass(Asset, 'duration', Duration);

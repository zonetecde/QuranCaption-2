import { invoke } from '@tauri-apps/api/core';
import { Duration } from './Duration.js';
import { AssetType } from './enums.js';
import { SerializableBase } from './misc/SerializableBase.js';
import { Utilities } from './misc/Utilities.js';
import { globalState } from '$lib/runes/main.svelte.js';
import { remove } from '@tauri-apps/plugin-fs';

export class Asset extends SerializableBase {
	id: number = 0;
	fileName: string = '';
	filePath: string = '';
	type: AssetType = AssetType.Unknown;
	duration: Duration = new Duration(0);
	fromYoutube: boolean = false;
	youtubeUrl?: string;

	constructor(filePath: string = '', youtubeUrl?: string) {
		super();

		// Si l'arg est undefined (cas de désérialisation)
		if (!filePath) {
			return;
		}

		this.id = Utilities.randomId();

		this.filePath = filePath;

		if (youtubeUrl) {
			this.youtubeUrl = youtubeUrl;
			this.fromYoutube = true;
		} else {
			this.fromYoutube = false;
		}

		const fileName = this.getFileName(filePath);

		console.log(filePath);

		this.fileName = fileName;

		const extension = this.getFileExtension(fileName);
		this.type = this.getAssetType(extension);

		this.duration = new Duration(0);

		if (this.type === AssetType.Audio || this.type === AssetType.Video) {
			this.initializeDuration();
		}
	}

	async initializeDuration() {
		this.duration = new Duration(
			(await invoke('get_duration', { filePath: this.filePath })) as number
		);
	}

	private getFileName(filePath: string): string {
		const normalizedPath = filePath.replace(/\\/g, '/');
		const parts = normalizedPath.split('/');
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

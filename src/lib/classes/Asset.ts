import { invoke } from '@tauri-apps/api/core';
import { Duration } from './Duration.js';
import { AssetType } from './enums.js';
import { SerializableBase } from './misc/SerializableBase.js';
import { Utilities } from './misc/Utilities.js';
import { openPath } from '@tauri-apps/plugin-opener';
import { exists, open, remove } from '@tauri-apps/plugin-fs';

export class Asset extends SerializableBase {
	id: number = 0;
	fileName: string = '';
	filePath: string = '';
	type: AssetType = AssetType.Unknown;
	duration: Duration = new Duration(0);
	exists: boolean = true;
	fromYoutube: boolean = false;
	youtubeUrl?: string;

	constructor(filePath: string = '', youtubeUrl?: string) {
		super();

		// Si l'arg est undefined (cas de désérialisation)
		if (!filePath) {
			return;
		}

		this.id = Utilities.randomId();
		this.exists = true;

		this.filePath = this.normalizeFilePath(filePath);

		if (youtubeUrl) {
			this.youtubeUrl = youtubeUrl;
			this.fromYoutube = true;
		} else {
			this.fromYoutube = false;
		}

		const fileName = this.getFileName(this.filePath);

		this.fileName = fileName;

		const extension = this.getFileExtension(fileName);
		this.type = this.getAssetType(extension);

		this.duration = new Duration(0);

		if (this.type === AssetType.Audio || this.type === AssetType.Video) {
			this.initializeDuration();
		}
	}

	private normalizeFilePath(filePath: string): string {
		// Normalize the file path to use forward slashes
		return filePath.replace(/\\/g, '/');
	}

	private async initializeDuration() {
		this.duration = new Duration(
			(await invoke('get_duration', { filePath: this.filePath })) as number
		);
	}

	async checkExistence() {
		if (!(await exists(this.filePath))) {
			this.exists = false;
		}
	}

	async openParentDirectory() {
		console.log('Opening parent directory for:', this.filePath);

		// Normaliser le chemin pour Windows et obtenir le répertoire parent
		const normalizedPath = this.filePath.replace(/\\/g, '/');
		const parentDir = normalizedPath.substring(0, normalizedPath.lastIndexOf('/'));

		// Reconvertir vers le format Windows si nécessaire
		const windowsParentDir = parentDir.replace(/\//g, '\\');

		console.log('Parent directory (normalized):', parentDir);
		console.log('Parent directory (windows):', windowsParentDir);
		console.log('Original filepath:', this.filePath);

		try {
			// Essayer d'abord avec le chemin normalisé
			await openPath(parentDir);
		} catch (error) {
			console.error('Error opening normalized path, trying Windows format:', error);
			try {
				// Si ça échoue, essayer avec le format Windows
				await openPath(windowsParentDir);
			} catch (secondError) {
				console.error('Error opening Windows path too:', secondError);
				throw secondError;
			}
		}
	}

	private getFileName(filePath: string): string {
		const parts = filePath.split('/');
		if (parts.length > 0) {
			return parts[parts.length - 1];
		}
		return '';
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

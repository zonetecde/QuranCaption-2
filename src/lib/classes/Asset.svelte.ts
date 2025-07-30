import { invoke } from '@tauri-apps/api/core';
import { AssetType, TrackType } from './enums.js';
import { SerializableBase } from './misc/SerializableBase.js';
import { Utilities } from './misc/Utilities.js';
import { openPath } from '@tauri-apps/plugin-opener';
import { exists, open, remove } from '@tauri-apps/plugin-fs';
import { globalState } from '$lib/runes/main.svelte.js';
import { Duration } from './index.js';

export class Asset extends SerializableBase {
	id: number = $state(0);
	fileName: string = $state('');
	filePath: string = $state('');
	type: AssetType = $state(AssetType.Unknown);
	duration: Duration = $state(new Duration(0));
	exists: boolean = $state(true);
	fromYoutube: boolean = $state(false);
	youtubeUrl?: string = $state(undefined);

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

		const extension = this.getFileExtension();
		this.type = this.getAssetType(extension);

		this.duration = new Duration(0);

		if (this.type === AssetType.Audio || this.type === AssetType.Video) {
			this.initializeDuration();
		}
	}

	addToTimeline(asVideo: boolean, asAudio: boolean) {
		if (asVideo) globalState.getVideoTrack.addAsset(this);
		if (asAudio) globalState.getAudioTrack.addAsset(this);
	}

	private normalizeFilePath(filePath: string): string {
		// Nettoie le chemin en supprimant les doubles slashes et normalise les séparateurs
		let normalized = filePath.replace(/\\/g, '/');

		// Supprime les doubles slashes sauf pour les protocoles (://)
		normalized = normalized.replace(/\/+/g, '/');

		// Gère le cas spécial des chemins UNC Windows (\\server\share -> //server/share)
		if (filePath.startsWith('\\\\')) {
			normalized = '//' + normalized.substring(1);
		}

		return normalized;
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
		const parentDir = this.getParentDirectory();
		await openPath(parentDir);
	}

	getFileNameWithoutExtension(): string {
		const filenames = this.fileName.split('.');
		if (filenames.length > 1) {
			return filenames.slice(0, -1).join('.');
		}
		return this.fileName;
	}

	getParentDirectory(): string {
		// Normalise le chemin d'abord
		const normalized = this.normalizeFilePath(this.filePath);

		// Trouve le dernier séparateur
		const lastSeparatorIndex = normalized.lastIndexOf('/');

		if (lastSeparatorIndex === -1) {
			// Pas de séparateur trouvé, retourne le répertoire courant
			return '.';
		}

		// Cas spécial pour les chemins racine
		if (lastSeparatorIndex === 0) {
			// Chemin Unix/Linux racine (ex: /file.txt -> /)
			return '/';
		}

		// Cas spécial pour les chemins Windows avec lettre de lecteur
		if (lastSeparatorIndex === 2 && normalized.charAt(1) === ':') {
			// Chemin Windows racine (ex: C:/file.txt -> C:/)
			return normalized.substring(0, 3);
		}

		// Cas spécial pour les chemins UNC
		if (normalized.startsWith('//')) {
			const parts = normalized.split('/');
			if (parts.length <= 4) {
				// Chemin UNC racine (ex: //server/share/file.txt -> //server/share)
				return parts.slice(0, 4).join('/');
			}
		}

		// Cas général
		return normalized.substring(0, lastSeparatorIndex);
	}

	updateFilePath(element: string) {
		this.filePath = this.normalizeFilePath(element);
		this.exists = true; // Réinitialise l'existence à vrai
		if (this.type === AssetType.Audio || this.type === AssetType.Video) {
			this.duration = new Duration(0);
			this.initializeDuration(); // Réinitialise la durée
		}
	}

	private getFileName(filePath: string): string {
		const normalized = this.normalizeFilePath(filePath);
		const parts = normalized.split('/');

		if (parts.length > 0) {
			return parts[parts.length - 1];
		}
		return '';
	}

	getFileExtension(): string {
		const parts = this.fileName.split('.');
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

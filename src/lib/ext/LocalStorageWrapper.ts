import { fs } from '@tauri-apps/api';
import { createDir, readTextFile, removeFile, writeTextFile } from '@tauri-apps/api/fs';
import { invoke } from '@tauri-apps/api/tauri';

export let STORAGE_PATH: string | undefined = undefined;
export let EXPORT_PATH: string | undefined = undefined;
export let ASSETS_PATH: string | undefined = undefined;

export async function getLocalStoragePath() {
	if (STORAGE_PATH) return STORAGE_PATH;

	let EXECUTAVLE_PATH = await invoke('path_to_executable');
	STORAGE_PATH = EXECUTAVLE_PATH + 'localStorage\\';
	return STORAGE_PATH;
}
export async function getExportPath() {
	if (EXPORT_PATH) return EXPORT_PATH;

	let EXECUTAVLE_PATH = await invoke('path_to_executable');
	EXPORT_PATH = EXECUTAVLE_PATH + 'export\\';
	return EXPORT_PATH;
}

export async function getAssetsPath() {
	if (ASSETS_PATH) return ASSETS_PATH;

	let EXECUTAVLE_PATH = await invoke('path_to_executable');
	ASSETS_PATH = EXECUTAVLE_PATH + 'assets\\';
	return ASSETS_PATH;
}

export async function initializeStorage() {
	try {
		await createDir(await getLocalStoragePath(), { recursive: true });
		await createDir(await getExportPath(), { recursive: true });
		await createDir(await getAssetsPath(), { recursive: true });
		console.log('Storage initialized');
	} catch (error) {
		console.error('Failed to initialize storage:', error);
	}
}

// Assurez-vous que toutes les données sont sérialisées en JSON
export const localStorageWrapper = {
	async setItem(key: string, value: any) {
		const filePath = `${await getLocalStoragePath()}${key}.json`;
		await writeTextFile(filePath, JSON.stringify(value));
	},

	async getItem(key: string) {
		const filePath = `${await getLocalStoragePath()}${key}.json`;
		try {
			const data = await readTextFile(filePath);
			return JSON.parse(data);
		} catch (error) {
			console.warn(`Key "${key}" not found in storage.`);
			return null;
		}
	},

	async removeItem(key: string) {
		const filePath = `${await getLocalStoragePath()}${key}.json`;
		try {
			await removeFile(filePath);
		} catch (error) {
			console.warn(`Failed to remove key "${key}" from storage.`);
		}
	},

	async clear() {
		// Si vous voulez supprimer tout le stockage, supprimez tout le dossier `localStorage`
		console.warn('Clear method is not implemented for this wrapper.');
	}
};

import { readTextFile, writeTextFile, create, remove, BaseDirectory } from '@tauri-apps/plugin-fs';

// Chemin où les données seront stockées
const STORAGE_PATH = 'localStorage/';

export async function initializeStorage() {
	console.log('Initializing storage...');
	try {
		await create(STORAGE_PATH, { baseDir: BaseDirectory.AppData });
		console.log('Storage initialized');
	} catch (error) {
		console.error('Failed to initialize storage:', error);
	}
}

// Assurez-vous que toutes les données sont sérialisées en JSON
export const localStorageWrapper = {
	async setItem(key: string, value: any) {
		const filePath = `${STORAGE_PATH}${key}.json`;
		await writeTextFile(filePath, JSON.stringify(value));
	},

	async getItem(key: string) {
		const filePath = `${STORAGE_PATH}${key}.json`;
		try {
			const data = await readTextFile(filePath);
			return JSON.parse(data);
		} catch (error) {
			console.warn(`Key "${key}" not found in storage.`);
			return null;
		}
	},

	async removeItem(key: string) {
		const filePath = `${STORAGE_PATH}${key}.json`;
		try {
			await remove(filePath);
		} catch (error) {
			console.warn(`Failed to remove key "${key}" from storage.`);
		}
	},

	async clear() {
		// Si vous voulez supprimer tout le stockage, supprimez tout le dossier `localStorage`
		console.warn('Clear method is not implemented for this wrapper.');
	}
};

import { globalState } from '$lib/runes/main.svelte';
import { invoke } from '@tauri-apps/api/core';

interface DiscordActivity {
	details?: string;
	state?: string;
	large_image_key?: string;
	large_image_text?: string;
	small_image_key?: string;
	small_image_text?: string;
}

class DiscordService {
	private isInitialized = false;
	private readonly APP_ID = '1413639399584956486';

	async init(): Promise<void> {
		if (this.isInitialized) return;

		invoke('init_discord_rpc', { appId: this.APP_ID })
			.then(() => {
				this.isInitialized = true;
				console.log('Discord Rich Presence initialisé');
			})
			.catch((error) => {
				console.error("Erreur lors de l'initialisation Discord RPC:", error);
			});
	}

	async updateActivity(activity: DiscordActivity): Promise<void> {
		if (!this.isInitialized) {
			await this.init();
		}

		try {
			await invoke('update_discord_activity', { activityData: activity });
		} catch (error) {
			console.error('Erreur lors de la mise à jour Discord RPC:', error);
			throw error;
		}
	}

	async clearActivity(): Promise<void> {
		if (!this.isInitialized) return;

		try {
			await invoke('clear_discord_activity');
		} catch (error) {
			console.error('Erreur lors du nettoyage Discord RPC:', error);
		}
	}

	async close(): Promise<void> {
		if (!this.isInitialized) return;

		try {
			await invoke('close_discord_rpc');
			this.isInitialized = false;
		} catch (error) {
			console.error('Erreur lors de la fermeture Discord RPC:', error);
		}
	}

	// Méthodes prédéfinies pour différents états
	async setIdleState(): Promise<void> {
		await this.updateActivity({
			details: 'Use Quran Caption',
			state: 'In the home menu',
			large_image_key: 'logo',
			large_image_text: 'Quran Caption',
			small_image_key: 'idle',
			small_image_text: 'Idle'
		});
	}

	async setEditingState(): Promise<void> {
		await this.updateActivity({
			details: 'Captioning Quran Recitation',
			state: globalState.currentProject
				? `Working on: ${globalState.currentProject.detail.name + (globalState.currentProject.detail.reciter ? ' (' + globalState.currentProject.detail.reciter + ')' : '')}`
				: 'Editing a video',
			large_image_key: 'logo',
			large_image_text: 'Quran Caption',
			small_image_key: 'edit',
			small_image_text: 'Captioning'
		});
	}
}

// Instance singleton
export const discordService = new DiscordService();

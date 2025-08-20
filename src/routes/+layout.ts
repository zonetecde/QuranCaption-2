import { Quran } from '$lib/classes/Quran';
import RecitersManager from '$lib/classes/Reciter';
import ModalManager from '$lib/components/modals/ModalManager';
import QPCV2FontProvider from '$lib/services/FontProvider';
import { telemetry } from '$lib/services/Telemetry';

export const prerender = true;
export const ssr = false;

// Load le Qur'an au démarrage de l'application
Quran.load();

// Load les réciteurs au démarrage de l'application
RecitersManager.loadReciters();

// Load la police d'écriture du Mushaf
QPCV2FontProvider.loadQCF2Data();

// main.ts ou entrypoint
window.addEventListener('error', (event) => {
	event.preventDefault();
	showErrorDialog(event.error);
});

window.addEventListener('unhandledrejection', (event) => {
	event.preventDefault();
	showErrorDialog(event.reason as Error);
});

function showErrorDialog(error: Error) {
	console.error(error);

	ModalManager.errorModal(
		'An unexpected error occurred',
		'Sorry — an error occurred while processing your request. It has been reported automatically. Please consider posting details about what you were doing on the Quran Caption Discord server to help me investigate! :)',
		JSON.stringify(error, Object.getOwnPropertyNames(error), 2)
	);

	if (import.meta.env.PROD) {
		telemetry(
			'Une erreur est survenue sur Quran Caption.' +
				JSON.stringify(error, Object.getOwnPropertyNames(error), 2)
		);
	}
}

import { mount, unmount } from 'svelte';
import Confirm from './Confirm.svelte';

export async function confirmModal(text: string): Promise<boolean> {
	return new Promise<boolean>((resolve) => {
		// Créer un conteneur pour le modal
		const container = document.createElement('div');
		container.classList.add('modal-wrapper');
		document.body.appendChild(container);

		// Monter le composant Svelte 5
		const confirm = mount(Confirm, {
			target: container,
			props: {
				text: text,
				resolve: (result: boolean) => {
					// Nettoyer et résoudre
					unmount(confirm);
					document.body.removeChild(container);
					resolve(result);
				}
			}
		});
	});
}

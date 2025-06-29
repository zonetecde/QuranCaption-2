import { mount, unmount } from 'svelte';
import Input from './Input.svelte';

export async function inputModal(
	text: string,
	defaultText: string = '',
	maxlength: number = 100
): Promise<string> {
	return new Promise<string>((resolve) => {
		// Créer un conteneur pour le modal
		const container = document.createElement('div');
		container.className = 'modal-wrapper';
		document.body.appendChild(container);

		// Monter le composant Svelte 5
		const input = mount(Input, {
			target: container,
			props: {
				text: text,
				defaultText: defaultText,
				maxlength: maxlength,
				resolve: (result: string) => {
					// Nettoyer et résoudre
					unmount(input);
					document.body.removeChild(container);
					resolve(result);
				}
			}
		});
	});
}

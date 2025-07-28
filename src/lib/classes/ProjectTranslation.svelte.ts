import { globalState } from '$lib/runes/main.svelte';
import { SerializableBase } from './misc/SerializableBase';

export class ProjectTranslation extends SerializableBase {
	// Liste des traductions ajoutées au projet
	addedTranslations: string[];

	// Contient les traductions originales du Coran utilisées dans le projet
	quranTranslations: {
		[key: string]: { [key: string]: string }; // Clé: langue, Valeur: { clé du verset: texte de la traduction }
	};

	constructor() {
		super();
		this.addedTranslations = [];
		this.quranTranslations = {};
	}

	async loadAvailableTranslations() {
		// Regarde si les traductions sont déjà chargées
		if (Object.keys(globalState.availableTranslations).length > 0) {
			return;
		}

		// Charge les traductions disponibles
		const object: any = await (await fetch('/translations/editions.json')).json();

		globalState.availableTranslations = object;

		console.log(
			'Available translations loaded:',
			globalState.availableTranslations['French'].translations[2].link
		);
	}
}

export class ProjectTranslation {
	// Liste des traductions ajoutées au projet
	addedTranslations: string[];

	// Contient les traductions originales du Coran utilisées dans le projet
	quranTranslations: {
		[key: string]: { [key: string]: string }; // Clé: langue, Valeur: { clé du verset: texte de la traduction }
	};

	constructor() {
		this.addedTranslations = [];
		this.quranTranslations = {};
	}
}

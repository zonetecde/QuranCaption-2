import { globalState } from '$lib/runes/main.svelte';
import type { SubtitleClip } from './Clip.svelte';
import type { Edition } from './Edition';
import { TrackType } from './enums';
import { SerializableBase } from './misc/SerializableBase';
import toast from 'svelte-5-french-toast';
import { PredefinedSubtitleTranslation, Translation, VerseTranslation } from './Translation.svelte';

export class ProjectTranslation extends SerializableBase {
	private TEXT_NO_TRANSLATION_AVAILABLE = 'No translation found';

	// Liste des traductions ajoutées au projet
	addedTranslations: Edition[];

	// Contient les traductions originales du Coran utilisées dans le projet
	versesTranslations: {
		[key: string]: { [key: string]: string }; // Clé: langue, Valeur: { clé du verset: texte de la traduction }
	};

	constructor() {
		super();
		this.addedTranslations = $state([]);
		this.versesTranslations = $state({});
	}

	/**
	 * Charge dans la mémoire les traductions disponibles
	 */
	async loadAvailableTranslations() {
		// Regarde si les traductions sont déjà chargées
		if (Object.keys(globalState.availableTranslations).length > 0) {
			return;
		}

		// Charge les traductions disponibles
		const object: any = await (await fetch('/translations/editions.json')).json();

		globalState.availableTranslations = object;
	}

	/**
	 * Récupère la traduction d'un verset spécifique dans une édition donnée
	 * @param surah Le numéro de la sourate
	 * @param verse Le numéro du verset
	 * @param edition L'édition de traduction à utiliser
	 * @returns La traduction ou 'No translation found' si non trouvée
	 */
	async getVerseTranslation(edition: Edition, surah: number, verse: number): Promise<string> {
		// Regarde si la traduction est déjà dans le cache
		const cacheKey = `${edition.name}_${surah}_${verse}`;
		const cached = globalState.caches.get(cacheKey);
		if (cached) return cached;

		// Récupère l'édition de traduction par son nom
		if (!edition) return this.TEXT_NO_TRANSLATION_AVAILABLE;

		// Load les traductions de toute la sourate si pas déjà chargée
		await this.loadSurahTranslation(edition, surah);

		// Construit l'URL de la traduction
		const cachedAfterLoad = globalState.caches.get(cacheKey);
		return cachedAfterLoad || this.TEXT_NO_TRANSLATION_AVAILABLE;
	}

	/**
	 * Load la traduction de tout les versets d'une sourate pour une édition donnée
	 */
	private async loadSurahTranslation(edition: Edition, surah: number): Promise<void> {
		// Check if we already have some verses from this surah cached
		const surahCacheKey = `${edition.name}_${surah}_loaded`;
		if (globalState.caches.has(surahCacheKey)) {
			return; // Already loaded
		}

		try {
			// Build URL for the entire surah
			const url = this.buildSurahUrl(edition, surah);
			const response = await fetch(url);

			if (!response.ok) {
				return;
			}

			const data = await response.json();
			const verses = this.extractSurahFromResponse(data, surah, edition);

			// Cache all verses from the surah
			for (const verseData of verses) {
				const cacheKey = `${edition.name}_${surah}_${verseData.verse}`;
				const processedText = this.processTranslationText(verseData.text, edition);
				globalState.caches.set(cacheKey, processedText);
			}

			// Mark this surah as loaded
			globalState.caches.set(surahCacheKey, 'loaded');
		} catch (error) {
			toast.error('Error fetching surah translation');
		}
	}

	/**
	 * Build URL for entire surah translation
	 */
	private buildSurahUrl(edition: Edition, surah: number): string {
		// Si l'édition fait partie des 5 traductions prises via une autre API (pour les poncutations en fin de verset)
		if (edition.comments === 'Ponctuation') {
			return edition.link.replace('{chapter}', surah.toString());
		}

		// Si l'édition fait partie d'une demande spéciale (saheeh international)
		if (edition.comments === 'Saheeh International') {
			return edition.link;
		}

		// Pour les éditions normales, on prend juste la sourate complète
		let baseUrl = edition.link.replace('.json', '');
		return `${baseUrl}/${surah}.json`;
	}

	/**
	 * Extract all verses from a surah response
	 */
	private extractSurahFromResponse(
		data: any,
		surah: number,
		edition: Edition
	): Array<{ verse: number; text: string }> {
		if (edition.comments === 'Ponctuation') {
			// Format: array with verse index as key
			const verses = [];
			for (let i = 1; i < data.length; i++) {
				if (data[i]) {
					verses.push({ verse: i, text: data[i][1] });
				}
			}
			return verses;
		} else if (edition.comments === 'Saheeh International') {
			// Format: nested object structure
			const verses = [];
			for (const key in data['quran']['en.sahih']) {
				const item = data['quran']['en.sahih'][key];
				if (item.surah === surah) {
					verses.push({ verse: item.ayah, text: item.verse });
				}
			}
			return verses;
		} else {
			// Format standard: { "chapter": [{"chapter": 1, "verse": 1, "text": "..."}, ...] }
			if (data.chapter && Array.isArray(data.chapter)) {
				return data.chapter.map((item: any) => ({
					verse: item.verse,
					text: item.text
				}));
			}
			return [];
		}
	}

	/**
	 * Process the translation text to remove unwanted characters
	 */
	private processTranslationText(text: string, edition: Edition): string {
		let processed = text.replace(/\[\d+\]/g, '');

		if (edition.comments === 'Ponctuation') {
			processed = processed
				.replaceAll(' .', '.')
				.replaceAll(' ,', ',')
				.replaceAll(' ;', ';')
				.replaceAll(' ]', ']')
				.replaceAll('[ ', '[')
				.replaceAll(' )', ')')
				.replaceAll('( ', '(');
		}

		return processed.trim();
	}

	/**
	 * Récupère toutes les traductions des sous-titres du projet pour une édition donnée
	 * @param edition L'édition de traduction à utiliser
	 * @returns Un objet contenant les traductions des sous-titres
	 */
	async getAllProjectSubtitlesTranslations(edition: Edition) {
		// Récupère toutes les traductions des sous-titres du projet pour une traduction donnée
		const translations: { [key: string]: string } = {};

		const versesInProject = new Set<string>();

		for (const predefinedSubtitle of globalState.getPredefinedSubtitleClips) {
			// Ajoute les versets des sous-titres pré-définis
			if (predefinedSubtitle.predefinedSubtitleType === 'Basmala') {
				translations['Basmala'] = globalState.availableTranslations[edition.language].basmala;
			} else if (predefinedSubtitle.predefinedSubtitleType === 'Istiadhah') {
				translations['Istiadhah'] = globalState.availableTranslations[edition.language].istiadhah;
			}
		}

		for (const subtitle of globalState.getSubtitleClips) {
			versesInProject.add(subtitle.getVerseKey());
		}

		// Télécharge les traductions pour chaque verset
		for (const verseKey of versesInProject) {
			const [surah, verse] = verseKey.split(':').map(Number);
			const translationText = await this.getVerseTranslation(edition, surah, verse);
			translations[verseKey] = translationText;
		}

		return translations;
	}

	/**
	 * Ajoute une traduction au projet
	 * @param edition L'édition de traduction à ajouter
	 * @param downloadedTranslations Les traductions téléchargées pour cette édition
	 */
	addTranslation(edition: Edition, downloadedTranslations: Record<string, string>) {
		this.addedTranslations.push(edition);

		// Pour chaque sous-titre du projet, ajoute la traduction correspondante
		for (const subtitle of globalState.getSubtitleClips) {
			// Récupère la traduction à partir du dictionnaire de traductions téléchargées
			const verseKey = subtitle.getVerseKey();
			const translationText =
				downloadedTranslations[verseKey] || this.TEXT_NO_TRANSLATION_AVAILABLE;

			if (!this.versesTranslations[edition.name]) {
				this.versesTranslations[edition.name] = {};
			}

			this.versesTranslations[edition.name][verseKey] = translationText;

			// Ajoute la traduction à l'objet de traduction du clip
			subtitle.translations[edition.name] = new VerseTranslation(
				0,
				translationText.split(' ').length - 1, // Par défaut toute la traduction est sélectionnée
				translationText,
				subtitle.isFullVerse ? 'completed by default' : 'to review'
			);
		}

		// Ajoute maintenant la traduction des sous-titre pré-définis
		const lang = globalState.availableTranslations[edition.language];

		for (const subtitle of globalState.getPredefinedSubtitleClips) {
			switch (subtitle.predefinedSubtitleType) {
				case 'Basmala':
					const translationText = lang.basmala;
					subtitle.translations[edition.name] = new PredefinedSubtitleTranslation(translationText);
					break;
				case 'Istiadhah':
					const istiadhahText = lang.istiadhah;
					subtitle.translations[edition.name] = new PredefinedSubtitleTranslation(istiadhahText);
					break;
				case 'Other':
					subtitle.translations[edition.name] = new PredefinedSubtitleTranslation('');
					break;
			}
		}
	}
}

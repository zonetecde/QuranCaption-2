import { globalState } from '$lib/runes/main.svelte';
import type { SubtitleClip } from './Clip.svelte';
import type { Edition } from './Edition';
import { TrackType } from './enums';
import { SerializableBase } from './misc/SerializableBase';
import toast from 'svelte-5-french-toast';

export class ProjectTranslation extends SerializableBase {
	NO_TRANSLATION = 'No translation found';

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
		if (!edition) return this.NO_TRANSLATION;

		// Load les traductions de toute la sourate si pas déjà chargée
		await this.loadSurahTranslation(edition, surah);

		// Construit l'URL de la traduction
		const cachedAfterLoad = globalState.caches.get(cacheKey);
		return cachedAfterLoad || this.NO_TRANSLATION;
	}

	/**
	 * Load la traduction de tout les versets d'une sourate pour une édition donnée
	 */
	private async loadSurahTranslation(edition: Edition, surah: number): Promise<void> {
		// Check if we already have some verses from this surah cached
		const surahCacheKey = `${edition.author}_${surah}_loaded`;
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
				const cacheKey = `${edition.author}_${surah}_${verseData.verse}`;
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
	 * Build translation URL based on edition type
	 */
	private buildTranslationUrl(edition: Edition, surah: number, verse: number): string {
		// Si l'édition fait partie des 5 traductions prises via une autre API (pour les poncutations en fin de verset)
		if (edition.comments === 'Ponctuation') {
			return edition.link.replace('{chapter}', surah.toString());
		}

		// Si l'édition fait partie d'une demande spéciale (saheeh international)
		if (edition.comments === 'Saheeh International') {
			return edition.link;
		}

		let baseUrl = edition.link.replace('.json', '');
		return `${baseUrl}/${surah}/${verse}.json`;
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
	 * Extract the text from the response based on the used API
	 */
	private extractTextFromResponse(
		data: any,
		surah: number,
		verse: number,
		edition: Edition
	): string {
		if (edition.comments === 'Ponctuation') {
			return data[verse][1];
		} else if (edition.comments === 'Saheeh International') {
			for (const key in data['quran']['en.sahih']) {
				const item = data['quran']['en.sahih'][key];
				if (item.surah === surah && item.ayah === verse) {
					return item.verse;
				}
			}
			return this.NO_TRANSLATION;
		} else {
			return data.text;
		}
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

		return processed;
	}

	/**
	 * Récupère toutes les traductions des sous-titres du projet pour une édition donnée
	 * @param edition L'édition de traduction à utiliser
	 * @returns Un objet contenant les traductions des sous-titres
	 */
	async getAllProjectSubtitlesTranslations(edition: Edition) {
		// Récupère toutes les traductions des sous-titres du projet pour une traduction donnée
		const link = edition.linkmin;

		const versesInProject = new Set<string>();
		for (const subtitle of globalState.currentProject!.content.timeline.getFirstTrack(
			TrackType.Subtitle
		).clips as SubtitleClip[]) {
			versesInProject.add(subtitle.surah + ':' + subtitle.verse);
		}

		const translations: { [key: string]: string } = {};

		// Télécharge les traductions pour chaque verset
		for (const verseKey of versesInProject) {
			const [surah, verse] = verseKey.split(':').map(Number);
			const translationText = await this.getVerseTranslation(edition, surah, verse);
			translations[verseKey] = translationText;
		}

		return translations;
	}
}

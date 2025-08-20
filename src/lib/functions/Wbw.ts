// Cache pour stocker les données des sourates déjà téléchargées
const surahCache = new Map<number, any>();

/**
 * Obtient la traduction ou translittération mot-à-mot d'un verset coranique
 * @param surahNumber - Numéro de la sourate (1-114)
 * @param verseNumber - Numéro du verset dans la sourate
 * @param type - Type de résultat souhaité ('translation' ou 'transliteration')
 * @returns Promise<string[]> - Tableau des mots traduits/translitérés
 *
 * @remarks
 * - Utilise un cache pour éviter les téléchargements répétés
 * - Source: https://raw.githubusercontent.com/qazasaz/quranwbw/refs/heads/master/surahs/data/
 * - Contient une gestion d'erreurs détaillée
 */
export async function getWordByWordTranslation(
	surahNumber: number,
	verseNumber: number,
	type: 'translation' | 'transliteration' = 'translation'
): Promise<string[]> {
	// Vérification des entrées invalides
	if (surahNumber < 1 || surahNumber > 114 || verseNumber < 1 || verseNumber > 286) {
		console.error('Numéro de sourate ou verset invalide');
		return [];
	}

	try {
		// Récupération des données de la sourate (avec cache)
		const surahData = await getSurahData(surahNumber);

		// Vérification de l'existence du verset
		if (!surahData[verseNumber]) {
			console.error(`Verset ${verseNumber} non trouvé dans la sourate ${surahNumber}`);
			return [];
		}

		// Extraction des mots selon le type demandé
		const words = surahData[verseNumber].w;
		const fieldKey = type === 'translation' ? 'e' : 'd';

		return words.map((word: any) => word[fieldKey] || '').filter((word: string) => word.length > 0);
	} catch (error) {
		handleTranslationError(error);
		return [];
	}
}

/**
 * Récupère les données d'une sourate avec mise en cache
 * @param surahNumber - Numéro de la sourate (1-114)
 * @returns Promise<any> - Données JSON de la sourate
 */
async function getSurahData(surahNumber: number): Promise<any> {
	// Vérification du cache
	if (surahCache.has(surahNumber)) {
		return surahCache.get(surahNumber);
	}

	// Construction de l'URL
	const url = `https://raw.githubusercontent.com/qazasaz/quranwbw/refs/heads/master/surahs/data/${surahNumber}.json`;

	// Requête HTTP avec timeout
	const response = await fetch(url, { signal: AbortSignal.timeout(10000) });

	if (!response.ok) {
		throw new Error(`Erreur HTTP: ${response.status} pour la sourate ${surahNumber}`);
	}

	// Traitement des données JSON
	const data = await response.json();

	// Mise en cache
	surahCache.set(surahNumber, data);

	return data;
}

/**
 * Gère les erreurs et log les détails
 * @param error - Erreur survenue
 */
function handleTranslationError(error: unknown): void {
	if (error instanceof DOMException && error.name === 'AbortError') {
		console.error("Requête annulée : dépassement du temps d'attente");
	} else if (error instanceof Error) {
		console.error(`Échec de la traduction : ${error.message}`);
	} else {
		console.error('Erreur inconnue lors de la récupération de la traduction');
	}
}

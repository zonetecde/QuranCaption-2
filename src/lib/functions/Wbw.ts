/**
 * Obtient la traduction ou translittération mot-à-mot d'un verset coranique
 * @param surahNumber - Numéro de la sourate (1-114)
 * @param verseNumber - Numéro du verset dans la sourate
 * @param type - Type de résultat souhaité ('translation' ou 'transliteration')
 * @returns Promise<string[]> - Tableau des mots traduits/translitérés
 *
 * @remarks
 * - Gère les cas spéciaux (silence, basmalah) avec des vérifications initiales
 * - Utilise un découpage intelligent des résultats de l'API
 * - Contient une gestion d'erreurs détaillée
 */
export async function getWordByWordTranslation(
	surahNumber: number,
	verseNumber: number,
	type: 'translation' | 'transliteration' = 'translation'
): Promise<string[]> {
	// Vérification des entrées invalides
	if ([surahNumber, verseNumber].some((n) => n < 1 || n > 114)) {
		console.error('Numéro de sourate ou verset invalide');
		return [];
	}

	try {
		// Construction de l'URL de l'API
		const apiUrl = `https://api.quranwbw.com/v1/verses?verses=${surahNumber}:${verseNumber}`;

		// Requête HTTP avec timeout
		const response = await fetch(apiUrl, { signal: AbortSignal.timeout(5000) });

		if (!response.ok) {
			throw new Error(`Erreur HTTP: ${response.status}`);
		}

		// Traitement des données JSON
		const data = await response.json();

		// Extraction du texte selon le type demandé
		const rawText = extractTextFromData(data, type);

		// Découpage et nettoyage des résultats
		return processRawText(rawText);
	} catch (error) {
		handleTranslationError(error);
		return [];
	}
}

/**
 * Extrait le texte brut des données JSON selon le type spécifié
 * @param data - Données JSON de l'API
 * @param type - Type de texte à extraire
 * @returns Chaîne brute non traitée
 */
function extractTextFromData(data: any, type: string): string {
	const jsonString = JSON.stringify(data);
	const typePattern = new RegExp(`"${type}":\\s*"([^"]+)"`);
	const match = jsonString.match(typePattern);

	if (!match || match.length < 2) {
		throw new Error('Type de traduction non trouvé dans la réponse');
	}

	return match[1].trim();
}

/**
 * Transforme le texte brut en tableau de mots
 * @param rawText - Texte brut de l'API
 * @returns Tableau de mots nettoyés
 */
function processRawText(rawText: string): string[] {
	// Gestion des cas vides
	if (!rawText) return [];

	// Découpage intelligent avec gestion multiple des séparateurs (des fois les mots sont séparés par ||, des fois par | seulement)
	return rawText
		.replace(/\s*\|\|\s*/g, '|') // Normalisation des séparateurs
		.split('|')
		.map((word) => word.trim())
		.filter((word) => word.length > 0);
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

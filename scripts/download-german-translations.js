import fs from 'fs';
import path from 'path';
import https from 'https';
import { fileURLToPath } from 'url';

// Pour obtenir __dirname dans un module ES6
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Chargement des métadonnées des sourates
const surahsData = fs.readFileSync(
	path.join(__dirname, '..', 'static', 'quran', 'surahs.json'),
	'utf8'
);
const surahs = JSON.parse(surahsData);

// Fonction pour faire une requête HTTPS
function makeRequest(url) {
	return new Promise((resolve, reject) => {
		https
			.get(url, (response) => {
				let data = '';

				response.on('data', (chunk) => {
					data += chunk;
				});

				response.on('end', () => {
					try {
						resolve(JSON.parse(data));
					} catch (error) {
						reject(error);
					}
				});
			})
			.on('error', (error) => {
				reject(error);
			});
	});
}

// Fonction pour obtenir les codepoints Unicode d'un texte arabe
function getCodepoints(arabicText) {
	const codepoints = [];
	for (let i = 0; i < arabicText.length; i++) {
		const codepoint = arabicText.codePointAt(i);
		if (codepoint !== undefined) {
			codepoints.push(codepoint);
			// Si c'est un caractère surrogate, avancer d'une position supplémentaire
			if (codepoint > 0xffff) {
				i++;
			}
		}
	}
	return codepoints;
}

// Fonction pour télécharger et formater une sourate
async function downloadAndFormatSurah(surahNumber) {
	try {
		console.log(`Téléchargement de la sourate ${surahNumber}...`);

		const url = `https://quranenc.com/api/v1/translation/sura/german_bubenheim/${surahNumber}`;
		const apiResponse = await makeRequest(url);

		if (!apiResponse.result || !Array.isArray(apiResponse.result)) {
			throw new Error(`Réponse API invalide pour la sourate ${surahNumber}`);
		}

		// Trouver les métadonnées de la sourate
		const surahMetadata = surahs.find((s) => s.id === surahNumber);
		if (!surahMetadata) {
			throw new Error(`Métadonnées non trouvées pour la sourate ${surahNumber}`);
		}

		// Créer l'objet principal avec les métadonnées
		const formattedData = [
			{
				id: surahNumber,
				city: surahMetadata.revelationPlace.toLowerCase() === 'mecca' ? 'makkah' : 'madina',
				name: {
					translated: surahMetadata.translation,
					transliterated: surahMetadata.name,
					codepoints: getCodepoints(surahMetadata.arabic)
				},
				ayahs: surahMetadata.totalAyah,
				slug: surahMetadata.name
					.toLowerCase()
					.replace(/[^a-z0-9]/g, '-')
					.replace(/-+/g, '-')
					.replace(/^-|-$/g, ''),
				translator: 'Frank Bubenheim'
			}
		];

		// Ajouter les versets traduits
		apiResponse.result.forEach((verse) => {
			const ayaNumber = parseInt(verse.aya);
			formattedData.push([ayaNumber, verse.translation]);
		});

		// Sauvegarder le fichier
		const outputPath = path.join(
			__dirname,
			'..',
			'static',
			'translations',
			'deu-frankbubenheim',
			`${surahNumber}.json`
		);
		fs.writeFileSync(outputPath, JSON.stringify(formattedData, null, 2), 'utf8');

		console.log(`✅ Sourate ${surahNumber} sauvegardée: ${outputPath}`);

		return true;
	} catch (error) {
		console.error(`❌ Erreur pour la sourate ${surahNumber}:`, error.message);
		return false;
	}
}

// Fonction principale
async function downloadAllSurahs() {
	console.log('🚀 Début du téléchargement des traductions allemandes (Frank Bubenheim)...\n');

	const totalSurahs = 114;
	const results = {
		success: 0,
		failed: 0,
		errors: []
	};

	// Télécharger toutes les sourates avec un délai entre les requêtes
	for (let i = 1; i <= totalSurahs; i++) {
		const success = await downloadAndFormatSurah(i);

		if (success) {
			results.success++;
		} else {
			results.failed++;
			results.errors.push(i);
		}

		// Délai de 100ms entre les requêtes pour éviter de surcharger l'API
		if (i < totalSurahs) {
			await new Promise((resolve) => setTimeout(resolve, 100));
		}
	}

	console.log('\n📊 Résultats du téléchargement:');
	console.log(`✅ Succès: ${results.success}/${totalSurahs}`);
	console.log(`❌ Échecs: ${results.failed}/${totalSurahs}`);

	if (results.errors.length > 0) {
		console.log(`🔍 Sourates échouées: ${results.errors.join(', ')}`);
	}

	console.log('\n🎉 Téléchargement terminé!');
}

// Exécuter le script
downloadAllSurahs().catch(console.error);

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const svgDir = path.join(__dirname, '..', 'static', 'surah-imgs');

function addPaddingToSvg(filePath) {
	try {
		// Lire le contenu du fichier SVG
		const svgContent = fs.readFileSync(filePath, 'utf8');

		// Extraire le viewBox actuel
		const viewBoxMatch = svgContent.match(/viewBox="([^"]+)"/);

		if (!viewBoxMatch) {
			console.warn(`Pas de viewBox trouvé dans ${filePath}`);
			return;
		}

		const viewBoxStr = viewBoxMatch[1];
		const [x, y, width, height] = viewBoxStr.split(' ').map(Number);

		// Calculer le nouveau viewBox avec 30px de padding à gauche et à droite
		const newX = x - 30;
		const newWidth = width + 60; // 30px à gauche + 30px à droite
		const newViewBox = `${newX} ${y} ${newWidth} ${height}`;

		// Remplacer le viewBox dans le contenu SVG
		const updatedSvgContent = svgContent.replace(/viewBox="[^"]+"/, `viewBox="${newViewBox}"`);

		// Écrire le fichier modifié
		fs.writeFileSync(filePath, updatedSvgContent, 'utf8');

		console.log(
			`✓ Padding ajouté à ${path.basename(filePath)} - ViewBox: ${viewBoxStr} → ${newViewBox}`
		);
	} catch (error) {
		console.error(`Erreur lors du traitement de ${filePath}:`, error.message);
	}
}

function processAllSvgFiles() {
	try {
		// Lire tous les fichiers du dossier
		const files = fs.readdirSync(svgDir);

		// Filtrer uniquement les fichiers .svg
		const svgFiles = files.filter((file) => file.endsWith('.svg'));

		console.log(`Traitement de ${svgFiles.length} fichiers SVG...`);
		console.log('');

		// Traiter chaque fichier SVG
		svgFiles.forEach((file) => {
			const filePath = path.join(svgDir, file);
			addPaddingToSvg(filePath);
		});

		console.log('');
		console.log(`✅ Traitement terminé ! ${svgFiles.length} fichiers modifiés.`);
	} catch (error) {
		console.error('Erreur lors de la lecture du dossier:', error.message);
	}
}

// Vérifier que le dossier existe
if (!fs.existsSync(svgDir)) {
	console.error(`Le dossier ${svgDir} n'existe pas !`);
	process.exit(1);
}

// Lancer le traitement
processAllSvgFiles();

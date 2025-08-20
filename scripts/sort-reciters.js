import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Lire le fichier reciter.json
const reciterPath = path.join(__dirname, '..', 'static', 'reciter.json');
const reciters = JSON.parse(fs.readFileSync(reciterPath, 'utf8'));

console.log(`Nombre total de récitateurs avant tri: ${reciters.length}`);

// Trier par ordre alphabétique selon le nom latin
reciters.sort((a, b) => {
	return a.latin.localeCompare(b.latin, 'en', {
		ignorePunctuation: true,
		sensitivity: 'base'
	});
});

console.log('Récitateurs triés par ordre alphabétique (nom latin)');

// Afficher les premiers récitateurs pour vérification
console.log('\nPremiers 10 récitateurs:');
reciters.slice(0, 10).forEach((reciter, index) => {
	console.log(`${index + 1}. ${reciter.latin} (${reciter.arabic}) - Numéro: ${reciter.number}`);
});

console.log('\nDerniers 10 récitateurs:');
reciters.slice(-10).forEach((reciter, index) => {
	console.log(
		`${reciters.length - 9 + index}. ${reciter.latin} (${reciter.arabic}) - Numéro: ${reciter.number}`
	);
});

// Écrire le fichier trié
fs.writeFileSync(reciterPath, JSON.stringify(reciters, null, '\t'), 'utf8');
console.log(`\nFichier reciter.json trié avec succès! Total: ${reciters.length} récitateurs`);

// Afficher les récitateurs avec un numéro assigné
const numberedReciters = reciters
	.filter((r) => r.number !== -1)
	.sort((a, b) => a.number - b.number);
console.log(`\nRécitateurs avec numéros assignés: ${numberedReciters.length}`);
numberedReciters.forEach((reciter) => {
	console.log(`${reciter.number}. ${reciter.latin} (${reciter.arabic})`);
});

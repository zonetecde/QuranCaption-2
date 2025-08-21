// scripts/simplify-qpc-json.js
import fs from 'fs';
import path from 'path';

const inputPath = path.join(process.cwd(), 'static/QPC2/qpc-v2.json');
const outputPath = path.join(process.cwd(), 'static/QPC2/qpc-v2-simplified.json');

const data = JSON.parse(fs.readFileSync(inputPath, 'utf8'));
const simplified = {};

for (const key in data) {
	if (data[key] && typeof data[key].text === 'string') {
		simplified[key] = data[key].text;
	}
}

fs.writeFileSync(outputPath, JSON.stringify(simplified, null, 2), 'utf8');
console.log('Fichier simplifié créé :', outputPath);

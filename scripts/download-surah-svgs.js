import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const outDir = path.resolve(__dirname, '..', 'static', 'surah-imgs');
const baseUrl = 'https://cdn.amrayn.com/qimages-c';

async function download() {
	await fs.mkdir(outDir, { recursive: true });

	for (let i = 1; i <= 114; i++) {
		const url = `${baseUrl}/${i}.svg`;
		const outPath = path.join(outDir, `${i}.svg`);
		try {
			const res = await fetch(url);
			if (!res.ok) {
				console.error(`Failed ${i}: ${res.status} ${res.statusText}`);
				continue;
			}
			const text = await res.text();
			await fs.writeFile(outPath, text, 'utf8');
			console.log(`Saved ${i}.svg`);
		} catch (err) {
			console.error(`Error downloading ${i}:`, err.message || err);
		}
	}
}

download()
	.then(() => console.log('Done'))
	.catch((e) => {
		console.error('Script failed:', e);
		process.exit(1);
	});

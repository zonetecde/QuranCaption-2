import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dir = path.join(__dirname, '../static/QPC2/fonts');

fs.readdirSync(dir).forEach((file) => {
	const match = file.match(/^p(\d+)(\..+)$/);
	if (match) {
		const num = match[1].padStart(3, '0');
		const ext = match[2];
		const newName = `p${num}${ext}`;
		if (newName !== file) {
			fs.renameSync(path.join(dir, file), path.join(dir, newName));
			console.log(`${file} -> ${newName}`);
		}
	}
});

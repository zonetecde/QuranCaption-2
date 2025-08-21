import { globalState } from '$lib/runes/main.svelte';

interface QpcGlyph {
	id: number;
	surah: string;
	ayah: string;
	word: string;
	location: string;
	text: string;
}

export class QPC2FontProvider {
	static qpc2Glyphs: Record<string, QpcGlyph> | undefined = undefined;
	static qpc1Glyphs: Record<string, QpcGlyph> | undefined = undefined;
	static verseMapping: Record<string, string> | undefined = undefined;
	static loadedFonts: Set<string> = new Set();

	static async loadQPC2Data() {
		if (!QPC2FontProvider.qpc2Glyphs) {
			QPC2FontProvider.qpc2Glyphs = await (await fetch('/QPC2/qpc-v2.json')).json();
		}
		if (!QPC2FontProvider.qpc1Glyphs) {
			QPC2FontProvider.qpc1Glyphs = await (await fetch('/QPC1/qpc-v1.json')).json();
		}
		if (!QPC2FontProvider.verseMapping) {
			// verse-mapping by Primo - May Allah reward him for his work
			QPC2FontProvider.verseMapping = await (await fetch('/QPC2/verse-mapping.json')).json();
		}

		// Charge déjà le fichier font avec la basmala
		QPC2FontProvider.loadFontIfNotLoaded('QCF2BSML');
	}

	/**
	 * Charge dynamiquement une police QCF si elle n'est pas déjà chargée
	 */
	static loadFontIfNotLoaded(fontName: string) {
		// Vérifie si la police est déjà chargée
		if (this.loadedFonts.has(fontName)) {
			return;
		}

		// Crée une nouvelle règle @font-face
		const style = document.createElement('style');
		style.textContent = `
			@font-face {
				font-family: '${fontName}';
				src: url('/QPC2/fonts/${fontName}.woff2') format('woff2');
				font-weight: normal;
				font-style: normal;
			}
		`;
		document.head.appendChild(style);

		// Marque la police comme chargée
		this.loadedFonts.add(fontName);
	}

	static getFontNameForVerse(surah: number, verse: number): string {
		// Get the font name for the verse
		const verseKey = `${surah}:${verse}`;

		const fontName = this.verseMapping![verseKey] || 'QCF0001';

		// Charge dynamiquement la police si elle n'est pas déjà chargée
		QPC2FontProvider.loadFontIfNotLoaded(fontName);

		return fontName;
	}

	static getQuranVerseGlyph(
		surah: number,
		verse: number,
		startWord: number,
		endWord: number,
		isLastWords: boolean,
		qpcVersion: 1 | 2 = 2
	): string {
		let str = '';
		for (let i = startWord + 1; i <= endWord + 1; i++) {
			const key = `${surah}:${verse}:${i}`;
			const glyph =
				qpcVersion === 1 ? QPC2FontProvider.qpc1Glyphs![key] : QPC2FontProvider.qpc2Glyphs![key];
			if (glyph) {
				str += glyph.text + ' ';
			}
		}

		// Si on veut inclure le numéro de verset
		if (
			isLastWords &&
			globalState.getVideoStyle.getStylesOfTarget('arabic').findStyle('show-verse-number')!.value
		) {
			const key = `${surah}:${verse}:${endWord + 2}`;
			const glyph = QPC2FontProvider.qpc2Glyphs![key];
			if (glyph) {
				str += glyph.text; // Ajoute le symbole du numéro de verset
			}
		}

		return str.trim();
	}

	static getBasmalaGlyph(): string {
		return 'ﭑﭒﭓ';
	}

	static getIstiadhahGlyph(): string {
		return 'ﭲﭳﭴﭵﭶ'.split('').join(' ');
	}
}

export default QPC2FontProvider;

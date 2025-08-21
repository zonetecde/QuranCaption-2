import { globalState } from '$lib/runes/main.svelte';

export class QPCFontProvider {
	static qpc2Glyphs: Record<string, string> | undefined = undefined;
	static qpc1Glyphs: Record<string, string> | undefined = undefined;
	static verseMapping: Record<string, string> | undefined = undefined;
	static loadedFonts: Set<string> = new Set();

	static async loadQPC2Data() {
		if (!QPCFontProvider.qpc2Glyphs) {
			QPCFontProvider.qpc2Glyphs = await (await fetch('/QPC2/qpc-v2.json')).json();
		}
		if (!QPCFontProvider.qpc1Glyphs) {
			QPCFontProvider.qpc1Glyphs = await (await fetch('/QPC1/qpc-v1.json')).json();
		}
		if (!QPCFontProvider.verseMapping) {
			// verse-mapping by Primo - May Allah reward him for his work
			QPCFontProvider.verseMapping = await (await fetch('/QPC2/verse-mapping.json')).json();
		}

		// Charge déjà le fichier font avec la basmala
		QPCFontProvider.loadFontIfNotLoaded('QCF2BSML');
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
		QPCFontProvider.loadFontIfNotLoaded(fontName);

		return fontName;
	}

	static getQuranVerseGlyph(
		surah: number,
		verse: number,
		startWord: number,
		endWord: number,
		isLastWords: boolean,
		qpcVersion: 'V1' | 'V2' = 'V2'
	): string {
		let str = '';
		for (let i = startWord + 1; i <= endWord + 1; i++) {
			const key = `${surah}:${verse}:${i}`;
			const glyph =
				qpcVersion === 'V1' ? QPCFontProvider.qpc1Glyphs![key] : QPCFontProvider.qpc2Glyphs![key];
			if (glyph) {
				str += glyph + ' ';
			}
		}

		// Si on veut inclure le numéro de verset
		if (
			isLastWords &&
			globalState.getVideoStyle.getStylesOfTarget('arabic').findStyle('show-verse-number')!.value
		) {
			const key = `${surah}:${verse}:${endWord + 2}`;
			const glyph = QPCFontProvider.qpc2Glyphs![key];
			if (glyph) {
				str += glyph; // Ajoute le symbole du numéro de verset
			}
		}

		return str.trim();
	}

	static getBasmalaGlyph(version: 'V1' | 'V2' = 'V2'): string {
		switch (version) {
			case 'V1':
				return '#"!'; // ou alors peut-être -,+*
			case 'V2':
				return 'ﭑﭒﭓ';
			default:
				return '';
		}
	}

	static getIstiadhahGlyph(version: 'V1' | 'V2' = 'V2'): string {
		switch (version) {
			case 'V1':
				return 'FEDCB'.split('').join(' ');
			case 'V2':
				return 'ﭲﭳﭴﭵﭶ'.split('').join(' ');
			default:
				return '';
		}
	}
}

export default QPCFontProvider;

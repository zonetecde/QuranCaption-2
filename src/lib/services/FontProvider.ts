import { globalState } from '$lib/runes/main.svelte';

interface QpcGlyph {
	id: number;
	surah: string;
	ayah: string;
	word: string;
	location: string;
	text: string;
}

export class QPCV2FontProvider {
	static qpcGlyphs: Record<string, QpcGlyph> | undefined = undefined;
	static verseMapping: Record<string, string> | undefined = undefined;
	static loadedFonts: Set<string> = new Set();

	static async loadQCF2Data() {
		if (!QPCV2FontProvider.qpcGlyphs) {
			QPCV2FontProvider.qpcGlyphs = await (await fetch('/QPC2/qpc-v2.json')).json();
		}
		if (!QPCV2FontProvider.verseMapping) {
			// verse-mapping by Primo - May Allah reward him for his work
			QPCV2FontProvider.verseMapping = await (await fetch('/QPC2/verse-mapping.json')).json();
		}

		// Charge déjà le fichier font avec la basmala
		QPCV2FontProvider.loadFontIfNotLoaded('QCF2BSML');
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
				src: url('/QPC2/fonts/${fontName}.ttf') format('truetype');
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
		QPCV2FontProvider.loadFontIfNotLoaded(fontName);

		return fontName;
	}

	static getQuranVerseGlyph(
		surah: number,
		verse: number,
		startWord: number,
		endWord: number,
		isLastWords: boolean
	): string {
		let str = '';
		for (let i = startWord + 1; i <= endWord + 1; i++) {
			const key = `${surah}:${verse}:${i}`;
			const glyph = QPCV2FontProvider.qpcGlyphs![key];
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
			const glyph = QPCV2FontProvider.qpcGlyphs![key];
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

	/**
	 * There's also this separate font for Basmallah stuff
	 */
	static readonly ligatureFontName = 'QCF4_QBSML';
}

export default QPCV2FontProvider;

export interface Verse {
	id: number;
	words: {
		arabic: string;
		transliteration: string;
		translation: string;
	}[];
}

export interface Surah {
	id: number;
	arabic: string;
	name: string;
	translation: string;
	totalAyah: number;
	verses: Verse[];
	arabicLong: string;
	revelationPlace: string;
}

export class Quran {
	static surahs: Surah[] = [];

	/**
	 * Charge le Coran depuis le fichier JSON (singleton)
	 */
	static async load() {
		if (Quran.surahs.length > 0) {
			return; // Le Coran est déjà chargé
		}
		const response = await fetch('/quran/surahs.json');
		const data: Surah[] = (await response.json()).map((surah: any) => ({
			...surah,
			verses: [] // Initialise les versets vides
		}));

		this.surahs = data;

		console.log('Quran loaded with', this.surahs, 'surahs');
		console.log(await this.getSurah(1));
	}

	/**
	 * Obtient toutes les sourates
	 */
	static getSurahs(): Surah[] {
		return Quran.surahs;
	}

	static getVerseCount(surah: number): number {
		const foundSurah = Quran.surahs.find((s) => s.id === surah);
		return foundSurah ? foundSurah.totalAyah : 0;
	}

	static getSurahsNames(): { id: number; transliteration: string }[] {
		return Quran.surahs.map((surah) => ({
			id: surah.id,
			transliteration: surah.name
		}));
	}

	/**
	 * Obtient une sourate par son ID
	 */
	static async getSurah(id: number): Promise<Surah> {
		const surah = Quran.surahs.find((surah) => surah.id === id)!;

		if (surah.verses.length === 0) {
			// Charge la sourate depuis le fichier JSON
			const response = await fetch(`/quran/${id}.json`);
			const data = await response.json();
			const verses: Verse[] = Object.entries(data).map(([id, verse]: [string, any]) => ({
				id: parseInt(id),
				words: verse.w.map((word: any) => ({
					arabic: word.c,
					transliteration: word.d,
					translation: word.e
				}))
			}));
			surah.verses = verses;
		}

		return surah;
	}

	/**
	 * Obtient un verset spécifique
	 */
	static async getVerse(surahId: number, verseId: number): Promise<Verse | undefined> {
		const surah = await Quran.getSurah(surahId);
		return surah.verses.find((verse) => verse.id === verseId);
	}
}

export interface Surah {
	id: number;
	name: string;
	transliteration: string;
	type: Type;
	total_verses: number;
	verses: Verse[];
}

export enum Type {
	Meccan = 'meccan',
	Medinan = 'medinan',
	OtherText = 'other_text'
}

export interface Verse {
	id: number;
	text: string;

	translations: { [key: string]: string };
}

export interface Quran {
	surahs: Surah[];
}

interface Edition {
	link: string;
	comments?: string;
}

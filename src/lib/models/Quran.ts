import { get } from 'svelte/store';
import { Mushaf } from '../stores/QuranStore';

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
	Medinan = 'medinan'
}

export interface Verse {
	id: number;
	text: string;

	translations: { [key: string]: string };
}

export interface Quran {
	surahs: Surah[];
}

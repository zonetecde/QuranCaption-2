import { writeTextFile, BaseDirectory } from '@tauri-apps/api/fs';

export async function loadQuran() {
	try {
		const response = await fetch('/quran/editions.json');
		const editions = await response.json();

		// for (var key in editions) {
		// 	if (editions.hasOwnProperty(key)) {
		// 		var value = editions[key];
		// 		console.log(value.link);
		// 		// Download
		// 		const content = await (await fetch(value.link)).text();

		// 		await writeTextFile(value.name + '.json', content, { dir: BaseDirectory.Download });
		// 		console.log('Downloaded ' + value.name);
		// 	}
		// }
	} catch (e) {
		console.error(e);
	}
}

export interface Surah {
	id: number;
	name: string;
	transliteration: string;
	translation: string;
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
	translation: string;
}

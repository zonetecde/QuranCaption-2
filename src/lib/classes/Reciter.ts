export class Reciter {
	arabic: string;
	latin: string;
	number: number;

	constructor(data: { arabic: string; latin: string; number: number }) {
		this.arabic = data.arabic;
		this.latin = data.latin;
		this.number = data.number;
	}
}

export default class RecitersManager {
	static reciters: Reciter[] = [];

	constructor() {}

	static async loadReciters() {
		try {
			const response = await fetch('/reciter.json');
			const data = await response.json();
			this.reciters = data.map((item: any) => new Reciter(item));
		} catch (error) {
			console.error('Failed to load reciters:', error);
		}
	}

	static getReciterObject(latinName: string): Reciter {
		return (
			this.reciters.find((r) => r.latin === latinName || r.arabic === latinName) ||
			new Reciter({ arabic: '', latin: latinName, number: -1 })
		);
	}
}

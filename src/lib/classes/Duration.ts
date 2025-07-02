import { SerializableBase } from './misc/SerializableBase';

export class Duration extends SerializableBase {
	ms: number;

	/**
	 * Crée une nouvelle instance de Duration
	 * @param ms Durée en millisecondes
	 */
	constructor(ms: number) {
		super();
		this.ms = ms;
	}

	/**
	 * Formate la durée en une chaîne de caractères au format HH:MM:SS ou MM:SS
	 * selon la durée
	 * @returns
	 */
	public getFormattedTime(alsoRemoveMinIfZero: boolean): string {
		const totalSeconds = Math.floor(this.ms / 1000);
		const hours = Math.floor(totalSeconds / 3600);
		const minutes = Math.floor((totalSeconds % 3600) / 60);
		const seconds = totalSeconds % 60;

		const formattedHours = hours > 0 ? `${hours.toString().padStart(2, '0')}:` : '';
		const formattedMinutes =
			alsoRemoveMinIfZero && minutes === 0 && hours === 0
				? ''
				: `${minutes.toString().padStart(alsoRemoveMinIfZero ? 1 : 2, '0')}:`;

		const formattedSeconds = seconds.toString().padStart(alsoRemoveMinIfZero ? 1 : 2, '0');

		return `${formattedHours}${formattedMinutes}${formattedSeconds}`;
	}

	toSeconds(): number {
		return Math.floor(this.ms / 1000);
	}
}

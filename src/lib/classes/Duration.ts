export class Duration {
	private readonly ms: number;

	constructor(ms: number) {
		this.ms = ms;
	}

	/**
	 * Formate la durée en une chaîne de caractères au format HH:MM:SS ou MM:SS
	 * selon la durée
	 * @returns
	 */
	public getFormattedTime(): string {
		const totalSeconds = Math.floor(this.ms / 1000);
		const hours = Math.floor(totalSeconds / 3600);
		const minutes = Math.floor((totalSeconds % 3600) / 60);
		const seconds = totalSeconds % 60;

		const formattedHours = hours > 0 ? `${hours.toString().padStart(2, '0')}:` : '';
		const formattedMinutes = minutes.toString().padStart(2, '0');
		const formattedSeconds = seconds.toString().padStart(2, '0');

		return `${formattedHours}${formattedMinutes}:${formattedSeconds}`;
	}
}

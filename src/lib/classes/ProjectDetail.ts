import { Utilities } from '.';
import { Duration } from './Duration';
import { Status } from './Status';
import { VerseRange } from './VerseRange';

export class ProjectDetail {
	id: number;

	deleted: boolean = false;

	name: string;
	reciter: string;
	createdAt: Date;
	updatedAt: Date;

	verseRange: VerseRange;
	duration: Duration;
	percentageCaption: number;
	status: Status;

	translations: {
		language: string;
		percentage: number;
	}[];

	constructor(name: string, reciter: string) {
		this.id = Utilities.randomId();

		this.name = name;
		this.reciter = reciter;
		this.createdAt = new Date();
		this.updatedAt = new Date();

		this.verseRange = new VerseRange();
		this.percentageCaption = 0;
		this.status = Status.NOT_SET;
		this.duration = new Duration(0);
		this.translations = [];
	}

	/**
	 * Met à jour la date de dernière modification du projet
	 */
	public updateTimestamp(): void {
		this.updatedAt = new Date();
	}

	/**
	 * Après récupération des projets depuis le Store, les objets complexes deviennent des objets simples.
	 * Cette méthode permet de reconstituer correctement tous les objets.
	 */
	public reviveObjects() {
		// Reconvertir les dates string en objets Date
		this.createdAt = new Date(this.createdAt);
		this.updatedAt = new Date(this.updatedAt);

		// Reconstituer l'objet VerseRange
		this.verseRange = Object.assign(new VerseRange(), this.verseRange);

		// Reconstituer l'objet Duration
		this.duration = Object.assign(new Duration(0), this.duration);
	}
}

import { Utilities } from '.';
import { Duration } from './Duration';
import { Status } from './Status';
import { VerseRange } from './VerseRange';
import { SerializableBase } from './misc/SerializableBase';

export class ProjectDetail extends SerializableBase {
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
		super();

		this.id = Utilities.randomId();

		this.name = $state(name);
		this.reciter = $state(reciter);
		this.createdAt = $state(new Date());
		this.updatedAt = $state(new Date());

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
}

// Enregistre les classes enfants pour la désérialisation automatique
SerializableBase.registerChildClass(ProjectDetail, 'verseRange', VerseRange);
SerializableBase.registerChildClass(ProjectDetail, 'duration', Duration);
SerializableBase.registerChildClass(ProjectDetail, 'status', Status);

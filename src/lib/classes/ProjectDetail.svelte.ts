import { globalState } from '$lib/runes/main.svelte';
import { TrackType, Utilities } from '.';
import { Duration } from './index.js';
import { Status } from './Status';
import { VerseRange } from './VerseRange';
import { SerializableBase } from './misc/SerializableBase';

export class ProjectDetail extends SerializableBase {
	static NAME_MAX_LENGTH: number = 50;
	static RECITER_MAX_LENGTH: number = 35;

	id: number;

	name: string;
	reciter: string;
	createdAt: Date;
	updatedAt: Date;

	verseRange: VerseRange;
	duration: Duration;
	percentageCaptioned: number;
	status: Status;

	// Format : language: percentage
	translations: { [language: string]: number };

	/**
	 * Crée une nouvelle instance de ProjectDetail
	 * @param name Nom du projet
	 * @param reciter Nom du réciteur
	 */
	constructor(name: string, reciter: string) {
		super();

		this.id = Utilities.randomId();

		this.name = $state(name);
		this.reciter = $state(reciter || 'not set');
		this.createdAt = $state(new Date());
		this.updatedAt = $state(new Date());

		this.verseRange = new VerseRange();
		this.percentageCaptioned = $state(0);
		this.status = Status.NOT_SET;
		this.duration = new Duration(0);
		this.translations = {};
	}

	/**
	 * Met à jour la date de dernière modification du projet
	 */
	public updateTimestamp(): void {
		this.updatedAt = new Date();
	}

	public updatePercentageCaptioned() {
		const captionedDuration = globalState.getSubtitleTrack.getDuration().ms || 0;

		const totalDuration = globalState.getAudioTrack.getDuration().ms || 0;

		let percentage = (captionedDuration / totalDuration) * 100;
		if (percentage >= 97) {
			percentage = 100;
		}

		globalState.currentProject!.detail.percentageCaptioned = Math.floor(percentage);
	}
}

// Enregistre les classes enfants pour la désérialisation automatique
SerializableBase.registerChildClass(ProjectDetail, 'duration', Duration);
SerializableBase.registerChildClass(ProjectDetail, 'verseRange', VerseRange);
SerializableBase.registerChildClass(ProjectDetail, 'status', Status);

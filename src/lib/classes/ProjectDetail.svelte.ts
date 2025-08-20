import { globalState } from '$lib/runes/main.svelte';
import { Edition, TrackType, Utilities } from '.';
import { Duration } from './index.js';
import { Status } from './Status';
import { VerseRange } from './VerseRange';
import { SerializableBase } from './misc/SerializableBase';
import type { ClipWithTranslation } from './Clip.svelte';
import { VerseTranslation } from './Translation.svelte';

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
		this.status = $state(Status.NOT_SET);
		this.duration = new Duration(0);
		this.translations = {};
	}

	/**
	 * Met à jour la date de dernière modification du projet
	 */
	public updateTimestamp(): void {
		this.updatedAt = new Date();
	}

	/**
	 * Met à jour le pourcentage de sous-titres captionnés par rapport
	 * à la durée total de la vidéo du projet
	 */
	public updatePercentageCaptioned() {
		const captionedDuration = globalState.getSubtitleTrack.getDuration().ms || 0;

		const totalDuration = globalState.getAudioTrack.getDuration().ms || 0;

		let percentage = (captionedDuration / totalDuration) * 100;
		if (percentage >= 97) {
			percentage = 100;
		}

		globalState.currentProject!.detail.percentageCaptioned = Math.floor(percentage);
	}

	/**
	 * Met à jour le pourcentage de complétion des traductions du projet pour
	 * une édition donnée
	 * @param edition L'édition à mettre à jour
	 */
	updatePercentageTranslated(edition: Edition) {
		// Calcul le nbre de traduction complété/nbre de traduction total
		let total: number = 0;
		let completed: number = 0;

		for (const subtitle of globalState.getSubtitleTrack.clips) {
			if (subtitle.type === 'Subtitle' || subtitle.type === 'Pre-defined Subtitle') {
				const translations = (subtitle as ClipWithTranslation).translations;
				if (translations && translations[edition.name]) {
					// Si la traduction existe, on l'ajoute au pourcentage
					if (!(translations[edition.name] instanceof VerseTranslation)) continue;

					if (translations[edition.name].isStatusComplete()) {
						completed++;
					}

					total++;
				}
			}
		}

		globalState.currentProject!.detail.translations[edition.author] = Math.floor(
			total > 0 ? (completed / total) * 100 : 0
		);
	}

	matchSearchQuery(searchQuery: string): boolean {
		const normalizedProjectInfo = `${this.name} ${this.reciter}`;
		return this.normalize(normalizedProjectInfo).includes(this.normalize(searchQuery));
	}

	normalize(str: string) {
		return str.trim().toLowerCase().replaceAll(/\s+/g, ' ').replaceAll('-', '').replaceAll("'", '');
	}
}

// Enregistre les classes enfants pour la désérialisation automatique
SerializableBase.registerChildClass(ProjectDetail, 'duration', Duration);
SerializableBase.registerChildClass(ProjectDetail, 'verseRange', VerseRange);
SerializableBase.registerChildClass(ProjectDetail, 'status', Status);

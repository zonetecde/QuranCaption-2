import { globalState } from '$lib/runes/main.svelte';
import { stat } from '@tauri-apps/plugin-fs';
import type { ClipWithTranslation, SubtitleClip } from './Clip.svelte';
import type { Edition } from './Edition';
import { SerializableBase } from './misc/SerializableBase';

export type TranslationStatus =
	| 'completed by default'
	| 'automatically trimmed'
	| 'ai trimmed'
	| 'to review'
	| 'reviewed'
	| 'ai error'
	| 'undefined';

export class Translation extends SerializableBase {
	// Le texte de la traduction
	text: string = $state('');

	// Status
	status: TranslationStatus = $state('undefined');

	// Type de la traduction
	type: 'verse' | 'predefined' | 'other' = 'other';

	constructor(text: string, status: TranslationStatus) {
		super();
		this.text = text;
		this.status = status;
	}

	isStatusComplete(): boolean {
		return (
			this.status === 'completed by default' ||
			this.status === 'reviewed' ||
			this.status === 'automatically trimmed' ||
			this.status === 'ai trimmed'
		);
	}

	getText(edition?: string, subtitle?: SubtitleClip): string {
		return this.text;
	}

	updateStatus(status: TranslationStatus, edition: Edition) {
		this.status = status;

		this.updatePercentageCompleted(edition);
	}

	/**
	 * Met à jour le pourcentage de complétion des traductions du projet pour
	 * une édition donnée
	 * @param edition L'édition à mettre à jour
	 */
	updatePercentageCompleted(edition: Edition) {
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
}

export class VerseTranslation extends Translation {
	// L'indice du mot de début de la traduction dans le texte original
	startWordIndex: number = $state(0);

	// L'indice du mot de fin de la traduction dans le texte original
	endWordIndex: number = $state(0);

	// Indique si la traduction ne se base pas sur la traduction originale
	isBruteForce: boolean = $state(false);

	constructor(text: string, status: TranslationStatus) {
		super(text, status);

		if (text === undefined) return; // déserialisation

		this.startWordIndex = 0;
		this.endWordIndex = text.split(' ').length - 1;
		this.isBruteForce = false;
		this.type = 'verse';
	}

	override getText(edition: string, subtitle: SubtitleClip): string {
		// Ajoute le numéro de verset si demandé dans les styles
		if (
			subtitle.startWordIndex === 0 &&
			globalState.getVideoStyle.getStylesOfTarget(edition).findStyle('show-verse-number')!.value
		) {
			return (
				subtitle.verse +
				((globalState.getVideoStyle.getStylesOfTarget(edition).findStyle('verse-number-separator')!
					.value as string) || '. ') +
				this.text
			);
		}

		return this.text;
	}
}

export class PredefinedSubtitleTranslation extends Translation {
	constructor(text: string) {
		super(text, 'completed by default');

		if (text === undefined) return; // déserialisation

		if (text.length > 0) {
			this.type = 'predefined';
		} else {
			this.type = 'other';
		}
	}
}

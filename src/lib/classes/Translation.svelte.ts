import { SerializableBase } from './misc/SerializableBase';

export type TranslationStatus = 'completed by default' | 'to review' | 'reviewed';

export class Translation extends SerializableBase {
	// Le texte de la traduction
	text: string;

	// Status
	status: TranslationStatus;

	// Type de la traduction
	type: 'verse' | 'predefined' | 'other' = 'other';

	constructor(text: string, status: TranslationStatus) {
		super();
		this.text = $state(text);
		this.status = $state(status);
	}
}

export class VerseTranslation extends Translation {
	// L'indice du mot de début de la traduction dans le texte original
	startWordIndex: number;

	// L'indice du mot de fin de la traduction dans le texte original
	endWordIndex: number;

	// Indique si la traduction ne se base pas sur la traduction originale
	isBruteForce: boolean;

	constructor(
		startWordIndex: number,
		endWordIndex: number,
		text: string,
		status: TranslationStatus
	) {
		super(text, status);
		this.startWordIndex = $state(startWordIndex);
		this.endWordIndex = $state(endWordIndex);
		this.isBruteForce = $state(false);
		this.type = 'verse';
	}
}

export class PredefinedSubtitleTranslation extends Translation {
	constructor(text: string) {
		super(text, 'completed by default');

		if (text.length > 0) {
			this.type = 'predefined';
		} else {
			this.type = 'other';
		}
	}
}

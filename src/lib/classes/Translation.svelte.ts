import { SerializableBase } from './misc/SerializableBase';

export type TranslationStatus = 'completed by default' | 'to translate' | 'translated';

export class Translation extends SerializableBase {
	// L'indice du mot de début de la traduction dans le texte original
	startWordIndex: number;

	// L'indice du mot de fin de la traduction dans le texte original
	endWordIndex: number;

	// Le texte de la traduction
	text: string;

	// Status
	status: TranslationStatus;

	// Indique si la traduction ne se base pas sur la traduction originale
	isBruteForce: boolean;

	constructor(
		startWordIndex: number,
		endWordIndex: number,
		text: string,
		status: TranslationStatus
	) {
		super();
		this.startWordIndex = $state(startWordIndex);
		this.endWordIndex = $state(endWordIndex);
		this.text = $state(text);
		this.isBruteForce = $state(false);
		this.status = $state(status);
	}
}

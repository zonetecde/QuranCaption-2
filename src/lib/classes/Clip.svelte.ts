import { globalState } from '$lib/runes/main.svelte';
import { Edition, TrackType, Translation } from '.';
import type { Asset } from './Asset.svelte';
import { SerializableBase } from './misc/SerializableBase';
import { Utilities } from './misc/Utilities';
import type { Track } from './Track.svelte';
import { PredefinedSubtitleTranslation, type VerseTranslation } from './Translation.svelte';
import type { Category, StyleName, TextStyleName } from './VideoStyle.svelte';

type ClipType = 'Silence' | 'Pre-defined Subtitle' | 'Subtitle' | 'Custom Text' | 'Asset';

export class Clip extends SerializableBase {
	id: number;
	startTime: number = $state(0);
	endTime: number = $state(0);
	duration: number = $state(0);

	type: ClipType;

	constructor(startTime: number, endTime: number, type: ClipType) {
		super();

		this.id = Utilities.randomId();
		this.startTime = startTime;
		this.endTime = endTime;
		this.duration = endTime - startTime;
		this.type = type;
	}

	getWidth(): number {
		if (this.duration === 0) {
			// C'est dans le cas où l'asset est une image. C'est alors l'image de fond de la vidéo.
			// Elle prend la taille de la timeline.
			return (
				globalState.currentProject!.content.timeline.getLongestTrackDuration().toSeconds() *
				globalState.currentProject?.projectEditorState.timeline.zoom!
			);
		}

		return (this.duration / 1000) * globalState.currentProject?.projectEditorState.timeline.zoom!;
	}

	/**
	 * Met à jour l'heure de début du clip tout en modifiant l'heure de fin du clip précédent pour éviter les chevauchements.
	 * @param newStartTime La nouvelle heure de début.
	 */
	updateStartTime(newStartTime: number) {
		// Vérification 1: Le clip actuel doit avoir au minimum 100ms de durée
		const newCurrentClipDuration = this.endTime - newStartTime;
		if (newCurrentClipDuration < 100) {
			return;
		}

		// Met à jour la endTime du clip à sa gauche pour éviter les chevauchements
		const track: Track = globalState.getSubtitleTrack;

		const previousClip = track.getClipBefore(this.id);

		if (previousClip && previousClip.id !== this.id) {
			// Vérification 2: Le clip précédent doit avoir au minimum 100ms de durée
			const newPreviousClipDuration = newStartTime - 1 - previousClip.startTime;

			if (newPreviousClipDuration < 100) {
				return;
			}

			previousClip.endTime = newStartTime - 1;
			previousClip.duration = previousClip.endTime - previousClip.startTime;
		}

		this.setStartTime(newStartTime);
	}

	/**
	 * Met à jour l'heure de fin du clip tout en modifiant l'heure de début du clip suivant pour éviter les chevauchements.
	 * @param newEndTime La nouvelle heure de fin.
	 */
	updateEndTime(newEndTime: number) {
		// Vérification 1: Le clip actuel doit avoir au minimum 100ms de durée
		const newCurrentClipDuration = newEndTime - this.startTime;
		if (newCurrentClipDuration < 100) {
			return;
		}

		// Met à jour la startTime du clip à sa droite pour éviter les chevauchements
		const track: Track = globalState.getSubtitleTrack;

		const nextClip = track.getClipAfter(this.id);

		if (nextClip && nextClip.id !== this.id) {
			// Vérification 2: Le clip suivant doit avoir au minimum 100ms de durée
			const newNextClipDuration = nextClip.endTime - (newEndTime + 1);

			if (newNextClipDuration < 100) {
				return;
			}

			// Met à jour le startTime du clip suivant
			nextClip.setStartTime(newEndTime + 1);
		}

		this.setEndTime(newEndTime);
	}

	/**
	 * Met à jour l'heure de début du clip et recalcule la durée.
	 * @param newStartTime La nouvelle heure de début.
	 */
	setStartTime(newStartTime: number) {
		this.startTime = newStartTime;
		this.duration = this.endTime - this.startTime;
	}

	/**
	 * Met à jour l'heure de fin du clip et recalcule la durée.
	 * @param newEndTime La nouvelle heure de fin.
	 */
	setEndTime(newEndTime: number) {
		this.endTime = newEndTime;
		this.duration = this.endTime - this.startTime;
	}
}

export class AssetClip extends Clip {
	assetId: number;

	constructor(startTime: number, endTime: number, assetId: number) {
		super(startTime, endTime, 'Asset');
		this.assetId = assetId;
	}
}

export class ClipWithTranslation extends Clip {
	translations: { [key: string]: Translation } = $state({});
	text: string = $state('');

	constructor(
		text: string,
		startTime: number,
		endTime: number,
		type: ClipType,
		translations: { [key: string]: Translation } = {}
	) {
		super(startTime, endTime, type);
		this.translations = translations;
		this.text = text;
	}

	/**
	 * Retourne la traduction associée à l'édition spécifiée.
	 * @param edition L'édition pour laquelle obtenir la traduction.
	 * @return La traduction associée à l'édition.
	 */
	getTranslation(edition: Edition): Translation {
		//@ts-ignore
		return this.translations[edition.name];
	}

	getText(): string {
		return this.text;
	}
}

export class SubtitleClip extends ClipWithTranslation {
	surah: number;
	verse: number;
	startWordIndex: number;
	endWordIndex: number;
	wbwTranslation: string; // Traduction mot à mot
	isFullVerse: boolean; // Indique si ce clip contient l'intégralité du verset
	isLastWordsOfVerse: boolean; // Indique si ce clip contient les derniers mots du verset

	constructor(
		startTime: number,
		endTime: number,
		surah: number,
		verse: number,
		startWordIndex: number,
		endWordIndex: number,
		text: string,
		wbwTranslation: string,
		isFullVerse: boolean,
		isLastWordsOfVerse: boolean,
		translations: { [key: string]: Translation } = {}
	) {
		super(text, startTime, endTime, 'Subtitle', translations);
		this.surah = $state(surah);
		this.verse = $state(verse);
		this.startWordIndex = $state(startWordIndex);
		this.endWordIndex = $state(endWordIndex);
		this.translations = translations;
		this.wbwTranslation = $state(wbwTranslation);
		this.isFullVerse = $state(isFullVerse);
		this.isLastWordsOfVerse = $state(isLastWordsOfVerse);
	}

	/**
	 * Retourne la clé du verset au format "Surah:Verse".
	 * @returns La clé du verset.
	 */
	getVerseKey(): string {
		return `${this.surah}:${this.verse}`;
	}

	getTextWithVerseNumber(): string {
		if (this.isLastWordsOfVerse) {
			return this.text + ` ${this.latinToArabicNumbers(this.verse)}`;
		}
		return this.text;
	}

	private latinToArabicNumbers(n: number): string {
		return n.toString().replace(/\d/g, (digit) => {
			const arabicDigits = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
			return arabicDigits[parseInt(digit, 10)];
		});
	}

	override getText(): string {
		// Regarde dans les styles si on doit afficher le numéro de verset
		if (
			globalState.getVideoStyle.getStylesOfTarget('arabic').findStyle('show-verse-number')!.value
		) {
			return this.getTextWithVerseNumber();
		}

		return this.text;
	}
}

export class SilenceClip extends Clip {
	constructor(startTime: number, endTime: number) {
		super(startTime, endTime, 'Silence');
	}
}

export type PredefinedSubtitleType =
	| 'Basmala'
	| 'Istiadhah'
	| 'Sadaqallahul Azim'
	| 'Takbir'
	| 'Other';

export class PredefinedSubtitleClip extends ClipWithTranslation {
	predefinedSubtitleType: PredefinedSubtitleType = $state('Other');

	constructor(startTime: number, endTime: number, type: PredefinedSubtitleType, text?: string) {
		let _text = '';
		switch (type) {
			case 'Basmala':
				_text = 'بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ';
				break;
			case 'Istiadhah':
				_text = 'أَعُوذُ بِاللَّهِ مِنَ الشَّيْطَانِ الرَّجِيمِ';
				break;
			case 'Sadaqallahul Azim':
				_text = 'صَدَقَ اللَّهُ الْعَظِيمُ';
				break;
			case 'Takbir':
				_text = 'اللَّهُ أَكْبَرُ';
				break;
			case 'Other':
				_text = text || '';
				break;
		}

		if (startTime === undefined) {
			// Déserialisation
			super(_text, 0, 0, 'Pre-defined Subtitle');
			return;
		}

		// Ajoute les traductions du clip
		let translations: { [key: string]: Translation } = {};

		// Récupère les traductions ajoutées au projet
		for (const edition of globalState.getProjectTranslation.addedTranslationEditions) {
			translations[edition.name] =
				globalState.getProjectTranslation.getPredefinedSubtitleTranslation(edition, type);
		}

		super(_text, startTime, endTime, 'Pre-defined Subtitle', translations);

		this.predefinedSubtitleType = type;
	}
}

export class CustomTextClip extends Clip {
	category: Category | undefined = $state(undefined);

	constructor(category: Category) {
		// Déserialization
		if (category === undefined) {
			super(0, 0, 'Custom Text');
			return;
		}

		let startTime = category.getStyle('time-appearance')!.value as number;
		let endTime = category.getStyle('time-disappearance')!.value as number;

		super(startTime, endTime, 'Custom Text');
		this.category = category;
	}

	setStyle(styleId: StyleName, value: any) {
		if (styleId === 'time-appearance') {
			this.setStartTime(value);
		} else if (styleId === 'time-disappearance') {
			this.setEndTime(value);
		}

		this.category!.styles.find((style) => style.id === styleId)!.value = value;
	}

	getAlwaysShow(): boolean {
		return this.category?.getStyle('always-show')!.value as boolean;
	}

	getText() {
		return this.category?.getStyle('text')!.value as string;
	}

	override getWidth(): number {
		// Si le custom text s'affiche sur toute la durée de la vidéo, alors retourne le temps
		// total de la vidéo
		if (this.getAlwaysShow()) {
			return (
				globalState.currentProject!.content.timeline.getLongestTrackDuration().toSeconds() *
				globalState.currentProject?.projectEditorState.timeline.zoom!
			);
		} else {
			// Appel du getWidth du parent
			return super.getWidth();
		}
	}
}

SerializableBase.registerChildClass(SubtitleClip, 'translations', Translation);
SerializableBase.registerChildClass(ClipWithTranslation, 'translations', Translation);
SerializableBase.registerChildClass(CustomTextClip, 'translations', Translation);

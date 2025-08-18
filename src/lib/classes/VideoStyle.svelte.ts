import { globalState } from '$lib/runes/main.svelte';
import toast from 'svelte-5-french-toast';
import type { CustomTextClip } from '.';
import { TrackType } from './enums';
import { SerializableBase } from './misc/SerializableBase';
import { Utilities } from './misc/Utilities';
import { CustomTextTrack } from './Track.svelte';
import type { a } from 'vitest/dist/chunks/suite.d.FvehnV49.js';

export type StyleValueType =
	| 'color'
	| 'number'
	| 'select'
	| 'boolean'
	| 'text'
	| 'time'
	| 'composite';

// Types spécifiques pour les catégories de styles
export type StyleCategoryName =
	| 'text'
	| 'positioning'
	| 'background'
	| 'shadow'
	| 'outline'
	| 'border'
	| 'effects'
	| 'animation'
	| 'general'
	| 'overlay'
	| 'surah-name'
	| 'creator-text';

// Types spécifiques pour chaque catégorie de styles
export type GeneralStyleName = 'show-subtitles' | 'show-verse-number' | 'verse-number-separator';

export type TextStyleName =
	| 'text-color'
	| 'font-size'
	| 'font-family'
	| 'font-weight'
	| 'text-transform'
	| 'letter-spacing'
	| 'line-height'
	| 'max-height'
	| 'reactive-font-size';

export type PositioningStyleName =
	| 'vertical-position'
	| 'horizontal-position'
	| 'width'
	| 'horizontal-text-alignment'
	| 'vertical-text-alignment';

export type BackgroundStyleName =
	| 'background-enable'
	| 'background-color'
	| 'background-opacity'
	| 'border-radius'
	| 'padding';

export type ShadowStyleName =
	| 'shadow-enable'
	| 'text-shadow'
	| 'text-shadow-color'
	| 'box-shadow'
	| 'box-shadow-color';

export type OutlineStyleName = 'outline-enable' | 'text-outline' | 'text-outline-color';

export type BorderStyleName = 'border-enable' | 'border-width' | 'border-color' | 'border-style';

export type EffectsStyleName = 'opacity' | 'blur' | 'brightness' | 'contrast';

export type AnimationStyleName = 'fade-duration' | 'scale' | 'rotation';

export type OverlayStyleName =
	| 'overlay-enable'
	| 'overlay-color'
	| 'overlay-opacity'
	| 'overlay-blur';

export type SurahNameStyleName =
	| 'show-surah-name'
	| 'surah-name-format'
	| 'show-arabic'
	| 'show-latin'
	| 'surah-size'
	| 'surah-opacity'
	| 'surah-latin-spacing'
	| 'surah-latin-text-style';

// Nouvelle définition pour les styles du Creator Text
export type CreatorTextStyleName = 'creator-text' | 'creator-text-composite';

export type CustomTextStyleName =
	| 'time-appearance'
	| 'time-disappearance'
	| 'text'
	| 'always-show'
	| 'custom-text-composite';

// Union type pour tous les noms de styles
export type StyleName =
	| GeneralStyleName
	| TextStyleName
	| PositioningStyleName
	| BackgroundStyleName
	| ShadowStyleName
	| OutlineStyleName
	| BorderStyleName
	| EffectsStyleName
	| AnimationStyleName
	| OverlayStyleName
	| SurahNameStyleName
	| CreatorTextStyleName
	| CustomTextStyleName;

export class Style extends SerializableBase {
	id: string = '';
	name: string = '';
	description: string = '';
	value: string | number | boolean | Style[] = '';
	valueType: StyleValueType = 'text';
	valueMin?: number;
	valueMax?: number;
	step?: number;
	options?: string[];
	css: string = '';
	tailwind?: boolean;
	tailwindClass?: string;
	icon: string = '';

	constructor(init?: Partial<Style>) {
		super();
		if (!init) return;
		Object.assign(this, init);
	}

	/**
	 * Méthode utile uniquement si valueType est composite.
	 * Génère le CSS d'un style composite
	 * @returns Le CSS de ce style composite
	 */
	generateCSSForComposite() {
		// Récupère tous les styles composites pour un style donné
		const compositeStyles = this.value as Style[];

		let css = '';
		for (let i = 0; i < compositeStyles.length; i++) {
			const element = compositeStyles[i];

			if (element.id.includes('enable') && !element.value) {
				// Si on désactive le style, on ne génère pas le CSS (c'est toute la partie outline là qui est concernée)
				break;
			}

			css += element.css.replaceAll('{value}', String(element.value)) + '\n';
		}

		return css;
	}

	/**
	 * Méthode utile uniquement si valueType est composite.
	 * @param styleId Le nom du style
	 * @param value La nouvelle valeur à appliquer
	 */
	setCompositeStyleValue(styleId: StyleName, value: string | number | boolean) {
		if (this.valueType === 'composite') {
			const style = (this.value as Style[]).find((s) => s.id === styleId);
			if (style) {
				style.value = value;
			}
		}
	}
}

export class Category extends SerializableBase {
	id: string = '';
	name: string = '';
	description: string = '';
	icon: string = '';
	styles: Style[] = [];

	constructor(init?: Partial<Category>) {
		super();
		if (!init) return;
		// assign simples
		const { styles, ...rest } = init as any;
		Object.assign(this, rest);

		// s'assurer que les styles sont des instances de Style
		if (Array.isArray(styles)) {
			this.styles = styles.map((s) => (s instanceof Style ? s : new Style(s)));
		}
	}

	getStyle(styleId: StyleName): Style | undefined {
		return this.styles.find((style) => style.id === styleId);
	}
}

class StylesData extends SerializableBase {
	categories: Category[] = $state([]);
	target: 'global' | 'arabic' | string = $state('');

	// Overrides spécifiques aux clips sélectionnés
	overrides: { [clipId: number]: { [styleId in StyleName]?: string | number | boolean } } = $state(
		{}
	);

	constructor(target: 'global' | 'arabic' | string, categories: Category[] = []) {
		super();
		this.target = target;
		this.categories = categories;
	}

	/**
	 * Génère le CSS pour tous les styles actifs (fusion globale + overrides clip si fournis)
	 */
	generateCSS(target: string, clipId?: number): string {
		let css = '';

		for (const category of this.categories) {
			let skipCategory = false;

			for (const style of category.styles) {
				const effectiveValue = this.getEffectiveValue(style.id as StyleName, clipId);

				// Pour les catégories de styles qui peuvent être désactivées (border, outline, ...),
				// si la propriété d'activation est false, on ne génère pas le CSS des autres styles
				if (style.valueType === 'boolean' && style.id.includes('enable')) {
					if (!Boolean(effectiveValue)) {
						skipCategory = true;
						break;
					} else {
						continue; // ne pas générer la règle pour le flag lui-même
					}
				}

				if (skipCategory) break;

				// Propriétés spécifiques à ignorer
				if (style.id === 'font-family' && String(effectiveValue) === 'Hafs') continue; // Gérer par une classe Tailwind
				if (style.id === 'max-height' && String(effectiveValue) === 'none') break; // Ignore les propriétés après qui dépendent de max-height

				if (style.tailwind) continue; // Ignore les styles Tailwind, qui sont appliqués différemment

				// Cas particulier pour l'alignement vertical/horizontal du texte
				if (style.id === 'vertical-text-alignment' || style.id === 'horizontal-text-alignment') {
					// @ts-ignore: style.css peut être un objet map
					css += style.css[effectiveValue as any] + '\n';
					continue;
				}

				// Cas particulier pour background-color
				if (style.id === 'background-color') {
					// Il faut convertir la couleur de l'hex en rgb
					if (typeof effectiveValue === 'string' && effectiveValue.startsWith('#')) {
						const r = parseInt(effectiveValue.slice(1, 3), 16);
						const g = parseInt(effectiveValue.slice(3, 5), 16);
						const b = parseInt(effectiveValue.slice(5, 7), 16);
						let valeur = `rgba(${r}, ${g}, ${b}, var(--background-opacity))`;

						css += 'background-color: ' + valeur + ';\n';
					}
				}

				// Cas particulier pour `show-subtitles`
				if (style.id === 'show-subtitles') {
					if (!Boolean(effectiveValue)) {
						return 'display: none;';
					}
				}

				// Remplace {value} par la valeur effective
				let cssRule = '';

				// Cas spécifique: certains styles sont différents pour l'arabe, comme par ex
				// le contour du texte (outline) qui nécessite du CSS différent.
				if (target === 'arabic' && 'cssarabic' in style) {
					//@ts-ignore
					cssRule = style.cssarabic.replaceAll(/{value}/g, String(effectiveValue));
				} else {
					cssRule = style.css.replaceAll(/{value}/g, String(effectiveValue));
				}

				if (cssRule.trim()) {
					css += cssRule + '\n';
				}
			}
		}

		return css;
	}

	generateTailwind(): string {
		let tailwindClasses = '';

		for (const category of this.categories) {
			for (const style of category.styles) {
				if (style.id === 'font-family' && style.value === 'Hafs') {
					// Utilise la police Hafs pour les styles de texte
					tailwindClasses += 'arabic ';
					continue;
				}

				// Ignore les styles qui ne sont pas des classes Tailwind
				if (!style.tailwind || !style.tailwindClass) continue;

				// Remplace {value} par la valeur actuelle
				let tailwindClass = style.tailwindClass.replaceAll(/{value}/g, String(style.value));

				if (tailwindClass.trim()) {
					tailwindClasses += tailwindClass + ' ';
				}
			}
		}

		return tailwindClasses.trim();
	}

	/**
	 * Définit la valeur d'un style
	 * @param styleId L'ID du style à modifier
	 * @param value La nouvelle valeur à appliquer
	 */
	setStyle(styleId: StyleName, value: string | number | boolean): void {
		// Trouve le style
		const style = this.findStyle(styleId);
		if (style) {
			style.value = value;
		}
	}

	/**
	 * Trouve un style par son ID
	 * @param styleId L'ID du style à trouver
	 * @returns Le style correspondant ou undefined s'il n'est pas trouvé
	 */
	findStyle(styleId: StyleName): Style | undefined {
		for (const category of this.categories) {
			const style = category.styles.find((s) => s.id === styleId);
			if (style) return style;
		}
		return undefined;
	}

	// Définit un style pour un ou plusieurs clips sélectionnés (override partiel)
	setStyleForClips(clipIds: number[], styleId: StyleName, value: string | number | boolean) {
		// Les styles du target 'global' sont uniques et ne peuvent pas être individualisés
		if (this.target === 'global') {
			return; // Il n'y a pas de style individuel pour les styles globaux
		}

		for (const clipId of clipIds) {
			// Créez un nouvel objet d'override pour le clip s'il n'existe pas
			if (!this.overrides[clipId]) this.overrides[clipId] = {} as any;

			// Regarde si pour la valeur qu'on veut appliquer à ce style pour ces clip
			// si c'est la valeur par déjà du style
			if (this.findStyle(styleId)?.value === value) {
				// Enlève l'override pour ce style, car c'est la valeur déjà de son parent
				delete this.overrides[clipId][styleId];
			} else {
				// Applique l'override avec la valeur
				this.overrides[clipId][styleId] = value;
			}
		}
	}

	// Supprime l'override pour un style donné sur une liste de clips
	clearStyleForClips(clipIds: number[], styleId: StyleName): void {
		// Aucun override à supprimer pour 'global'
		if (this.target === 'global') {
			return;
		}

		for (const clipId of clipIds) {
			const byClip = this.overrides[clipId];
			if (!byClip) continue;

			// Supprime l'override pour ce style sur ce clip
			if (byClip[styleId] !== undefined) {
				delete byClip[styleId];
			}

			// Nettoyage de l'objet clip s'il est vide
			if (Object.keys(byClip).length === 0) {
				delete this.overrides[clipId];
			}
		}
	}

	// Retourne la valeur effective (override clip si présent, sinon valeur du StylesData)
	getEffectiveValue(styleId: StyleName, clipId?: number): string | number | boolean {
		const style = this.findStyle(styleId);

		// Si target est 'global', on ignore toujours les overrides
		if (this.target === 'global') {
			return style ? (style.value as string | number | boolean) : '';
		}

		// Structure des overrides pour StylesData : overrides[clipId][styleId] = value
		if (
			clipId !== undefined &&
			this.overrides[clipId] &&
			this.overrides[clipId][styleId] !== undefined
		) {
			return this.overrides[clipId][styleId]!;
		}

		return style ? (style.value as string | number | boolean) : '';
	}

	hasOverrideForAny(clipIds: number[], styleId: StyleName): boolean {
		// Jamais d'override pour 'global'
		if (this.target === 'global') return false;

		return clipIds.some((clipId) => {
			const byClip = this.overrides[clipId];
			return !!(byClip && byClip[styleId] !== undefined);
		});
	}

	/**
	 * Indique si un clip possède au moins un override de style.
	 */
	hasAnyOverrideForClip(clipId: number): boolean {
		const byClip = this.overrides?.[clipId];
		if (!byClip) return false;

		return Object.values(byClip).some((cat) => !!cat && Object.keys(cat as any).length > 0);
	}

	/**
	 * Créer les styles composites pour un style donné s'il n'existe pas déjà
	 * @param compositeStyleId L'identifiant du style composite
	 */
	async loadCompositeStyles(compositeStyleId: StyleName) {
		const style = this.findStyle(compositeStyleId);

		if (style && !(style.value instanceof Array)) {
			// Ajoute les styles composite par défaut
			style.value = await (await fetch('./styles/compositeStyles.json')).json();

			if (compositeStyleId === 'surah-latin-text-style') {
				style.setCompositeStyleValue('font-size', 8);
			}
		}
	}

	/**
	 * Get - et créer si nécessaire - les styles composites pour un style donné
	 * @param compositeStyleId L'identifiant du style composite
	 */
	getCompositeStyles(compositeStyleId: StyleName): Style[] {
		// Try catch au cas où le style composite n'a toujours pas été créé
		const style = this.findStyle(compositeStyleId);

		if (style) {
			if (style.value instanceof Array) return style.value as Style[];
			// Style par défaut non encore créé si on arrive là.
		}

		return [];
	}
}

// Stockage des overrides par clip
export type ClipStyleOverrides = {
	[clipId: number]: {
		[target: string]: {
			[categoryId in StyleCategoryName]?: {
				[styleId in StyleName]?: string | number | boolean;
			};
		};
	};
};

export class VideoStyle extends SerializableBase {
	styles: StylesData[] = $state([]);

	lastUpdated: Date = $state(new Date());

	constructor() {
		super();
	}

	/**
	 * Retourne les styles par défaut d'un projet
	 * @returns Les styles par défaut d'une vidéo
	 */
	static async getDefaultVideoStyle(): Promise<VideoStyle> {
		// Créer un nouveau objet VideoStyle
		const videoStyle = new VideoStyle();

		// Ajoute les styles par défaut pour chaque target
		videoStyle.styles.push(
			new StylesData('global', await (await fetch('./styles/globalStyles.json')).json())
		);
		videoStyle.styles.push(
			new StylesData('arabic', await (await fetch('./styles/styles.json')).json())
		);

		// Set les styles par défaut pour l'arabe
		videoStyle.getStylesOfTarget('arabic').setStyle('font-family', 'Hafs');
		videoStyle.getStylesOfTarget('arabic').setStyle('font-size', 90);
		videoStyle.getStylesOfTarget('arabic').setStyle('vertical-position', -100);

		return videoStyle;
	}

	/**
	 * Obtient les styles d'une cible spécifique
	 * @param target La cible à interroger (global, arabic, ou une traduction)
	 * @returns Les styles de la cible
	 */
	getStylesOfTarget(target: 'global' | 'arabic' | string): StylesData {
		const styles = this.styles.find((s) => s.target === target);
		return styles ? styles : new StylesData(target);
	}

	/**
	 * Update la valeur d'un style d'un custom text (depuis la track Custom Text)
	 * @param customTextId L'ID du texte custom
	 * @param styleId L'ID du style à obtenir
	 * @param value La nouvelle valeur à appliquer
	 */
	setCustomTextStyle(
		customTextId: StyleCategoryName,
		styleId: StyleName,
		value: string | number | boolean
	): void {
		// Trouve donc le clip correspondant pour update sa valeur
		const clip = globalState.getCustomTextTrack.clips.find(
			(c) => (c as CustomTextClip).category?.id === customTextId
		) as CustomTextClip | undefined;
		if (clip) {
			clip.setStyle(styleId, value);
		}
	}

	doesTargetStyleExist(target: string): boolean {
		return this.styles.find((style) => style.target === target) !== undefined;
	}

	async addStylesForEdition(translationEdition: string) {
		if (this.doesTargetStyleExist(translationEdition)) return;

		const defaultStyles = await (await fetch('./styles/styles.json')).json();

		const stylesData = new StylesData(translationEdition, defaultStyles);

		// Styles par défaut pour les traductions
		stylesData.setStyle('font-family', 'Georgia'); // Définit la police par défaut
		stylesData.setStyle('font-size', 60); // Définit la taille de police par défaut
		stylesData.setStyle('vertical-position', 100); // Définit la hauteur de ligne par défaut

		this.styles.push(stylesData);
	}

	async getDefaultCustomTextCategory(): Promise<Category> {
		const category: Category = await (await fetch('./styles/customText.json')).json();
		const randomId = Utilities.randomId();
		category.id += '-' + randomId;
		category.getStyle('custom-text-composite')!.id += '-' + randomId;
		return category;
	}

	/**
	 * Ajoute un texte personnalisé au projet dans les styles globaux
	 */
	async addCustomText() {
		// Ajoute la track Custom Text si non existante
		if (!globalState.currentProject!.content.timeline.doesTrackExist(TrackType.CustomText)) {
			globalState.currentProject!.content.timeline.addTrack(new CustomTextTrack());
		}

		// Ajoute le custom text au projet
		const customTextCategory = await this.getDefaultCustomTextCategory();
		globalState.getCustomTextTrack.addCustomText(customTextCategory);
	}

}

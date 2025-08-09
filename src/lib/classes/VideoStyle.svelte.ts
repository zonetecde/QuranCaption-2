import { globalState } from '$lib/runes/main.svelte';
import { SerializableBase } from './misc/SerializableBase';

export type StyleValueType = 'color' | 'number' | 'select' | 'boolean';

// Types spécifiques pour les catégories de styles
export type StyleCategoryName =
	| 'text'
	| 'positioning'
	| 'background'
	| 'shadow'
	| 'outline'
	| 'border'
	| 'effects'
	| 'animation';

// Types spécifiques pour chaque catégorie de styles
export type TextStyleName =
	| 'text-color'
	| 'font-size'
	| 'font-family'
	| 'font-weight'
	| 'text-transform'
	| 'letter-spacing'
	| 'line-height'
	| 'max-height'
	| 'font-size-reactive';

export type PositioningStyleName =
	| 'vertical-position'
	| 'horizontal-position'
	| 'horizontal-padding'
	| 'text-align'
	| 'max-width';

export type BackgroundStyleName =
	| 'background-enable'
	| 'background-color'
	| 'background-opacity'
	| 'border-radius'
	| 'padding';

export type ShadowStyleName = 'shadow-enable' | 'text-shadow' | 'box-shadow';

export type OutlineStyleName = 'outline-enable' | 'text-outline' | 'text-outline-color';

export type BorderStyleName = 'border-enable' | 'border-width' | 'border-color' | 'border-style';

export type EffectsStyleName = 'opacity' | 'blur' | 'brightness' | 'contrast';

export type AnimationStyleName = 'fade-duration' | 'scale' | 'rotation';

// Union type pour tous les noms de styles
export type StyleName =
	| TextStyleName
	| PositioningStyleName
	| BackgroundStyleName
	| ShadowStyleName
	| OutlineStyleName
	| BorderStyleName
	| EffectsStyleName
	| AnimationStyleName;

export interface Style {
	id: string;
	name: string;
	description: string;
	value: string | number | boolean;
	valueType: StyleValueType;
	valueMin?: number;
	valueMax?: number;
	step?: number;
	options?: string[];
	css: string;
	tailwind?: boolean;
	tailwindClass?: string;
	applyGlobally: boolean;
	icon: string;
}

export interface Category {
	id: string;
	name: string;
	description: string;
	icon: string;
	styles: Style[];
}

// Type pour la structure complète des styles avec array
export type StylesData = Category[];

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
	styles: {
		[target: string]: StylesData;
	} = $state({});

	// Overrides spécifiques aux clips sélectionnés
	overrides: ClipStyleOverrides = $state({});

	lastUpdated: Date = new Date();

	constructor(styles: { [target: string]: StylesData } = {}, lastUpdated: Date = new Date()) {
		super();
		this.styles = styles;
		this.lastUpdated = lastUpdated;
	}

	static async setDefaultStylesToDefaultOne(): Promise<VideoStyle> {
		const globalStyles: StylesData = await (await fetch('./globalStyles.json')).json();
		const styles: StylesData = await VideoStyle.getDefaultStyles();

		if (styles) {
			const dict: any = {};
			dict['global'] = globalStyles;
			dict['arabic'] = styles;

			const videoStyle = new VideoStyle(
				{
					global: globalStyles,
					arabic: styles
				},
				new Date()
			);

			videoStyle.setStyle('arabic', 'text', 'font-family', 'Hafs');
			videoStyle.setStyle('arabic', 'text', 'font-size', 90);
			videoStyle.setStyle('arabic', 'positioning', 'vertical-position', -100);

			return videoStyle;
		}

		return new VideoStyle();
	}

	static async getDefaultStyles(): Promise<StylesData> {
		const styles: StylesData = await (await fetch('./styles.json')).json();

		return styles;
	}
	/**
	 * Obtient une catégorie de styles par son ID
	 */
	getCategory(target: string, categoryId: StyleCategoryName): Category {
		return this.styles[target].find((category) => category.id === categoryId)!;
	}

	/**
	 * Obtient un style spécifique dans une catégorie
	 */
	getStyle(target: string, categoryId: StyleCategoryName, styleId: StyleName): Style {
		const category = this.getCategory(target, categoryId);
		return category!.styles.find((style) => style.id === styleId)!;
	}

	setStyle(
		target: string,
		categoryId: StyleCategoryName,
		styleId: StyleName,
		value: string | number | boolean
	): void {
		const category = this.getCategory(target, categoryId);
		const style = category.styles.find((style) => style.id === styleId);
		if (style) {
			style.value = value;
		}
		this.lastUpdated = new Date();
	}

	// Définit un style pour un ou plusieurs clips sélectionnés (override partiel)
	setStyleForClips(
		clipIds: number[],
		target: string,
		categoryId: StyleCategoryName,
		styleId: StyleName,
		value: string | number | boolean
	) {
		for (const clipId of clipIds) {
			if (!this.overrides[clipId]) this.overrides[clipId] = {} as any;
			if (!this.overrides[clipId][target]) this.overrides[clipId][target] = {} as any;
			if (!this.overrides[clipId][target][categoryId])
				this.overrides[clipId][target][categoryId] = {} as any;

			this.overrides[clipId][target][categoryId]![styleId] = value;
		}
		this.lastUpdated = new Date();
	}

	// Retourne la valeur effective (override clip si présent, sinon valeur globale)
	getEffectiveValue(
		target: string,
		categoryId: StyleCategoryName,
		styleId: StyleName,
		clipId?: number
	): string | number | boolean {
		if (
			clipId !== undefined &&
			this.overrides[clipId] &&
			this.overrides[clipId][target] &&
			this.overrides[clipId][target][categoryId] &&
			this.overrides[clipId][target][categoryId]![styleId] !== undefined
		) {
			return this.overrides[clipId][target][categoryId]![styleId]!;
		}
		return this.getStyle(target, categoryId, styleId).value;
	}

	hasOverrideForAny(
		clipIds: number[],
		target: string,
		categoryId: StyleCategoryName,
		styleId: StyleName
	): boolean {
		return clipIds.some((clipId) => {
			return !!(
				this.overrides[clipId] &&
				this.overrides[clipId][target] &&
				this.overrides[clipId][target][categoryId] &&
				this.overrides[clipId][target][categoryId]![styleId] !== undefined
			);
		});
	}

	/**
	 * Génère le CSS pour tous les styles actifs (fusion globale + overrides clip si fournis)
	 */
	generateCSS(target: string, clipId?: number): string {
		let css = '';

		if (!this.styles[target]) return '';

		for (const category of this.styles[target]) {
			let skipCategory = false;

			for (const style of category.styles) {
				const effectiveValue = this.getEffectiveValue(
					target,
					category.id as StyleCategoryName,
					style.id as StyleName,
					clipId
				);

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
				if (style.id === 'max-height' && String(effectiveValue) === 'none') continue;
				if (style.id === 'font-family' && String(effectiveValue) === 'Hafs') continue; // Gérer par une classe Tailwind
				if (style.id === 'max-height' && String(effectiveValue) === 'none') break; // Ignore les propriétés après qui dépendent de max-height

				if (style.tailwind) continue; // Ignore les styles Tailwind, qui sont appliqués différemment

				// Cas particulier pour l'alignement vertical/horizontal du texte
				if (style.id === 'vertical-text-alignment' || style.id === 'horizontal-text-alignment') {
					// @ts-ignore: style.css peut être un objet map
					css += style.css[effectiveValue as any] + '\n';
					continue;
				}

				// Remplace {value} par la valeur effective
				let cssRule = style.css.replaceAll(/{value}/g, String(effectiveValue));

				if (cssRule.trim()) {
					css += cssRule + '\n';
				}
			}
		}

		return css;
	}

	generateTailwind(target: string): string {
		let tailwindClasses = '';

		if (!this.styles[target]) return '';

		for (const category of this.styles[target]) {
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

	async addStylesForEdition(name: string) {
		if (!this.styles[name]) {
			const defaultStyles = await VideoStyle.getDefaultStyles();

			this.styles[name] = defaultStyles;

			// Styles par défaut pour les traductions
			this.setStyle(name, 'text', 'font-size', 60); // Définit la taille de police par défaut
			this.setStyle(name, 'text', 'font-family', 'Georgia'); // Définit la police par défaut
			this.setStyle(name, 'positioning', 'vertical-position', 100); // Définit la hauteur de ligne par défaut
		}
	}

	/**
	 * Remet tous les styles à leurs valeurs par défaut
	 */
	async resetToDefaults(): Promise<void> {
		const defaultStyle = await VideoStyle.setDefaultStylesToDefaultOne();
		this.styles = defaultStyle.styles;
		this.overrides = {};
		this.lastUpdated = new Date();
	}
}

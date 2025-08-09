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

export class VideoStyle extends SerializableBase {
	styles: {
		[target: string]: StylesData;
	} = $state({});

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
	}

	/**
	 * Génère le CSS pour tous les styles actifs
	 */
	generateCSS(target: string): string {
		let css = '';

		if (!this.styles[target]) return '';

		for (const category of this.styles[target]) {
			for (const style of category.styles) {
				// Pour les catégories de styles qui peuvent être désactivées (border, outline, ...),
				// alors si la catégorie est désactivée, on ne génère pas le CSS de tout les autres styles
				if (style.valueType === 'boolean' && !style.value && style.id.includes('enable')) {
					break;
				}

				// Propriétés spécifiques à ignorer
				if (style.id === 'max-height' && style.value === 'none') continue;
				if (style.id === 'font-family' && style.value === 'Hafs') continue; // Gérer par une classe Tailwind
				if (style.id === 'max-height' && style.value === 'none') break; // Ignore les propriétés après qui dépendent de max-height

				if (style.tailwind) continue; // Ignore les styles Tailwind, qui sont appliqués différemment

				// Cas particulier pour l'alignement vertical du texte, le CSS est différent et donc est dans un objet dans l'attribut `css` qui dépend de la valeur
				if (style.id === 'vertical-text-alignment' || style.id === 'horizontal-text-alignment') {
					//@ts-ignore
					css += style.css[style.value] + '\n';
					continue;
				}

				// Remplace {value} par la valeur actuelle
				let cssRule = style.css.replaceAll(/{value}/g, String(style.value));

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
		this.lastUpdated = new Date();
	}
}

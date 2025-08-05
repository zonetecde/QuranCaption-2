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
	| 'max-height';

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

// Interface étendue pour un style avec des propriétés optionnelles
export interface ExtendedStyle extends Style {
	tailwind?: boolean;
	tailwindClass?: string;
}

// Interface pour une catégorie avec types spécifiques
export interface TypedCategory<T extends string = string> {
	name: string;
	description: string;
	icon: string;
	styles: Record<T, ExtendedStyle>;
}

// Types spécifiques pour chaque catégorie
export type TextCategory = TypedCategory<TextStyleName>;
export type PositioningCategory = TypedCategory<PositioningStyleName>;
export type BackgroundCategory = TypedCategory<BackgroundStyleName>;
export type ShadowCategory = TypedCategory<ShadowStyleName>;
export type OutlineCategory = TypedCategory<OutlineStyleName>;
export type BorderCategory = TypedCategory<BorderStyleName>;
export type EffectsCategory = TypedCategory<EffectsStyleName>;
export type AnimationCategory = TypedCategory<AnimationStyleName>;

// Type pour la structure complète des styles avec autocomplétion
export interface TypedStylesData {
	text: TextCategory;
	positioning: PositioningCategory;
	background: BackgroundCategory;
	shadow: ShadowCategory;
	outline: OutlineCategory;
	border: BorderCategory;
	effects: EffectsCategory;
	animation: AnimationCategory;
}

export interface Style {
	name: string;
	description: string;
	value: string | number | boolean;
	valueType: StyleValueType;
	valueMin?: number;
	valueMax?: number;
	step?: number;
	options?: string[];
	css: string;
	applyGlobally: boolean;
	icon: string;
}

export class VideoStyle extends SerializableBase {
	styles: TypedStylesData = {} as TypedStylesData;
	lastUpdated: Date = new Date();

	constructor(styles: TypedStylesData = {} as TypedStylesData, lastUpdated: Date = new Date()) {
		super();
		this.styles = styles;
		this.lastUpdated = lastUpdated;
	}

	static async getDefaultVideoStyle(): Promise<VideoStyle> {
		const styles: TypedStylesData = await (await fetch('./styles.json')).json();

		if (styles) {
			return new VideoStyle(styles, new Date());
		}

		return new VideoStyle();
	}

	/**
	 * Génère le CSS pour tous les styles actifs
	 */
	generateCSS(): string {
		let css = '';

		for (const categoryName in this.styles) {
			const category = (this.styles as any)[categoryName];
			for (const styleName in category.styles) {
				const style = category.styles[styleName] as ExtendedStyle;

				// Pour les catégories de styles qui peuvent être désactivées (border, outline, ...),
				// alors si la catégorie est désactivée, on ne génère pas le CSS de tout les autres styles
				if (style.valueType === 'boolean' && !style.value && !styleName.includes('Enable')) {
					break;
				}

				if (style.tailwind) continue; // Ignore les styles Tailwind, qui sont appliqués différemment

				// Remplace {value} par la valeur actuelle
				let cssRule = style.css.replace(/{value}/g, String(style.value));

				if (cssRule.trim()) {
					css += cssRule + '\n';
				}
			}
		}

		console.log('Generated CSS:', css);

		return css;
	}

	generateTailwind(): string {
		let tailwindClasses = '';

		for (const categoryName in this.styles) {
			const category = (this.styles as any)[categoryName];
			for (const styleName in category.styles) {
				const style = category.styles[styleName] as ExtendedStyle;

				// Ignore les styles qui ne sont pas des classes Tailwind
				if (!style.tailwind || !style.tailwindClass) continue;

				// Remplace {value} par la valeur actuelle
				let tailwindClass = style.tailwindClass.replace(/{value}/g, String(style.value));

				if (tailwindClass.trim()) {
					tailwindClasses += tailwindClass + ' ';
				}
			}
		}

		console.log('Generated Tailwind classes:', tailwindClasses);

		return tailwindClasses.trim();
	}

	/**
	 * Remet tous les styles à leurs valeurs par défaut
	 */
	async resetToDefaults(): Promise<void> {
		const defaultStyle = await VideoStyle.getDefaultVideoStyle();
		this.styles = defaultStyle.styles;
		this.lastUpdated = new Date();
	}
}

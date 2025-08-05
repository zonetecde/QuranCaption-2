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

export interface Category {
	name: string;
	description: string;
	icon: string;
	styles: Record<string, Style>;
}

export type StylesData = Record<string, Category>;

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
	 * Obtient une catégorie de styles par son nom (version générale)
	 */
	getCategory(categoryName: string): Category | undefined {
		return (this.styles as any)[categoryName];
	}

	/**
	 * Obtient une catégorie de styles avec autocomplétion
	 */
	getCategoryTyped<T extends StyleCategoryName>(categoryName: T): TypedStylesData[T] | undefined {
		return this.styles[categoryName];
	}

	/**
	 * Obtient un style spécifique dans une catégorie (version générale)
	 */
	getStyle(categoryName: string, styleName: string): ExtendedStyle | undefined {
		const category = this.getCategory(categoryName);
		return category?.styles[styleName] as ExtendedStyle;
	}

	/**
	 * Met à jour la valeur d'un style spécifique
	 */
	updateStyleValue(
		categoryName: string,
		styleName: string,
		value: string | number | boolean
	): boolean {
		const style = this.getStyle(categoryName, styleName);
		if (style) {
			style.value = value;
			this.lastUpdated = new Date();
			return true;
		}
		return false;
	}

	/**
	 * Méthodes helper typées pour accéder facilement aux styles
	 */
	getTextStyle(styleName: TextStyleName): ExtendedStyle | undefined {
		return this.styles.text.styles[styleName];
	}

	getPositioningStyle(styleName: PositioningStyleName): ExtendedStyle | undefined {
		return this.styles.positioning.styles[styleName];
	}

	getBackgroundStyle(styleName: BackgroundStyleName): ExtendedStyle | undefined {
		return this.styles.background.styles[styleName];
	}

	getShadowStyle(styleName: ShadowStyleName): ExtendedStyle | undefined {
		return this.styles.shadow.styles[styleName];
	}

	getOutlineStyle(styleName: OutlineStyleName): ExtendedStyle | undefined {
		return this.styles.outline.styles[styleName];
	}

	getBorderStyle(styleName: BorderStyleName): ExtendedStyle | undefined {
		return this.styles.border.styles[styleName];
	}

	getEffectsStyle(styleName: EffectsStyleName): ExtendedStyle | undefined {
		return this.styles.effects.styles[styleName];
	}

	getAnimationStyle(styleName: AnimationStyleName): ExtendedStyle | undefined {
		return this.styles.animation.styles[styleName];
	}

	/**
	 * Méthodes pour mettre à jour des styles spécifiques avec autocomplétion
	 */
	updateTextStyle(styleName: TextStyleName, value: string | number | boolean): boolean {
		const style = this.getTextStyle(styleName);
		if (style) {
			style.value = value;
			this.lastUpdated = new Date();
			return true;
		}
		return false;
	}

	updatePositioningStyle(
		styleName: PositioningStyleName,
		value: string | number | boolean
	): boolean {
		const style = this.getPositioningStyle(styleName);
		if (style) {
			style.value = value;
			this.lastUpdated = new Date();
			return true;
		}
		return false;
	}

	updateBackgroundStyle(styleName: BackgroundStyleName, value: string | number | boolean): boolean {
		const style = this.getBackgroundStyle(styleName);
		if (style) {
			style.value = value;
			this.lastUpdated = new Date();
			return true;
		}
		return false;
	}

	updateShadowStyle(styleName: ShadowStyleName, value: string | number | boolean): boolean {
		const style = this.getShadowStyle(styleName);
		if (style) {
			style.value = value;
			this.lastUpdated = new Date();
			return true;
		}
		return false;
	}

	updateOutlineStyle(styleName: OutlineStyleName, value: string | number | boolean): boolean {
		const style = this.getOutlineStyle(styleName);
		if (style) {
			style.value = value;
			this.lastUpdated = new Date();
			return true;
		}
		return false;
	}

	updateBorderStyle(styleName: BorderStyleName, value: string | number | boolean): boolean {
		const style = this.getBorderStyle(styleName);
		if (style) {
			style.value = value;
			this.lastUpdated = new Date();
			return true;
		}
		return false;
	}

	updateEffectsStyle(styleName: EffectsStyleName, value: string | number | boolean): boolean {
		const style = this.getEffectsStyle(styleName);
		if (style) {
			style.value = value;
			this.lastUpdated = new Date();
			return true;
		}
		return false;
	}

	updateAnimationStyle(styleName: AnimationStyleName, value: string | number | boolean): boolean {
		const style = this.getAnimationStyle(styleName);
		if (style) {
			style.value = value;
			this.lastUpdated = new Date();
			return true;
		}
		return false;
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

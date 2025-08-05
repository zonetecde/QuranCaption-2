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

export class VideoStyle {
	styles: TypedStylesData = {} as TypedStylesData;
	lastUpdated: Date = new Date();

	constructor(styles: TypedStylesData = {} as TypedStylesData, lastUpdated: Date = new Date()) {
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
	 * Méthodes d'accès typées pour chaque catégorie avec autocomplétion complète
	 */
	get text(): TextCategory | undefined {
		return this.styles.text;
	}

	get positioning(): PositioningCategory | undefined {
		return this.styles.positioning;
	}

	get background(): BackgroundCategory | undefined {
		return this.styles.background;
	}

	get shadow(): ShadowCategory | undefined {
		return this.styles.shadow;
	}

	get outline(): OutlineCategory | undefined {
		return this.styles.outline;
	}

	get border(): BorderCategory | undefined {
		return this.styles.border;
	}

	get effects(): EffectsCategory | undefined {
		return this.styles.effects;
	}

	get animation(): AnimationCategory | undefined {
		return this.styles.animation;
	}

	/**
	 * Méthodes helper typées pour accéder facilement aux styles
	 */
	getTextStyle(styleName: TextStyleName): ExtendedStyle | undefined {
		return this.text?.styles[styleName];
	}

	getPositioningStyle(styleName: PositioningStyleName): ExtendedStyle | undefined {
		return this.positioning?.styles[styleName];
	}

	getBackgroundStyle(styleName: BackgroundStyleName): ExtendedStyle | undefined {
		return this.background?.styles[styleName];
	}

	getShadowStyle(styleName: ShadowStyleName): ExtendedStyle | undefined {
		return this.shadow?.styles[styleName];
	}

	getOutlineStyle(styleName: OutlineStyleName): ExtendedStyle | undefined {
		return this.outline?.styles[styleName];
	}

	getBorderStyle(styleName: BorderStyleName): ExtendedStyle | undefined {
		return this.border?.styles[styleName];
	}

	getEffectsStyle(styleName: EffectsStyleName): ExtendedStyle | undefined {
		return this.effects?.styles[styleName];
	}

	getAnimationStyle(styleName: AnimationStyleName): ExtendedStyle | undefined {
		return this.animation?.styles[styleName];
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
				const style = category.styles[styleName];

				// Pour les styles boolean, on n'applique le CSS que si la valeur est true
				if (style.valueType === 'boolean' && !style.value) {
					continue;
				}

				// Remplace {value} par la valeur actuelle
				let cssRule = style.css.replace(/{value}/g, String(style.value));

				if (cssRule.trim()) {
					css += cssRule + '\n';
				}
			}
		}

		return css;
	}

	/**
	 * Génère le CSS pour une catégorie spécifique
	 */
	generateCategoryCSS(categoryName: string): string {
		const category = this.getCategory(categoryName);
		if (!category) return '';

		let css = '';

		for (const styleName in category.styles) {
			const style = category.styles[styleName];

			// Pour les styles boolean, on n'applique le CSS que si la valeur est true
			if (style.valueType === 'boolean' && !style.value) {
				continue;
			}

			// Remplace {value} par la valeur actuelle
			let cssRule = style.css.replace(/{value}/g, String(style.value));

			if (cssRule.trim()) {
				css += cssRule + '\n';
			}
		}

		return css;
	}

	/**
	 * Remet tous les styles à leurs valeurs par défaut
	 */
	async resetToDefaults(): Promise<void> {
		const defaultStyle = await VideoStyle.getDefaultVideoStyle();
		this.styles = defaultStyle.styles;
		this.lastUpdated = new Date();
	}

	/**
	 * Clone l'instance actuelle
	 */
	clone(): VideoStyle {
		return new VideoStyle(JSON.parse(JSON.stringify(this.styles)), new Date(this.lastUpdated));
	}
}

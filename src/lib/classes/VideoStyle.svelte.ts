export type StyleValueType = 'color' | 'number' | 'select' | 'boolean';

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
	styles: StylesData = {};
	lastUpdated: Date = new Date();

	constructor(styles: StylesData = {}, lastUpdated: Date = new Date()) {
		this.styles = styles;
		this.lastUpdated = lastUpdated;
	}

	static async getDefaultVideoStyle(): Promise<VideoStyle> {
		const styles: StylesData = await (await fetch('./styles.json')).json();

		if (styles) {
			return new VideoStyle(styles, new Date());
		}

		return new VideoStyle();
	}

	/**
	 * Obtient une catégorie de styles par son nom
	 */
	getCategory(categoryName: string): Category | undefined {
		return this.styles[categoryName];
	}

	/**
	 * Obtient un style spécifique dans une catégorie
	 */
	getStyle(categoryName: string, styleName: string): Style | undefined {
		const category = this.getCategory(categoryName);
		return category?.styles[styleName];
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
	 * Génère le CSS pour tous les styles actifs
	 */
	generateCSS(): string {
		let css = '';

		for (const categoryName in this.styles) {
			const category = this.styles[categoryName];
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

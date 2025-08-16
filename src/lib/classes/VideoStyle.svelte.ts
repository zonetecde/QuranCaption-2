import { globalState } from '$lib/runes/main.svelte';
import { SerializableBase } from './misc/SerializableBase';

export type StyleValueType = 'color' | 'number' | 'select' | 'boolean' | 'text' | 'composite';

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
	| 'surah-name';

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
	| 'font-size-reactive';

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
	| 'surah-latin-spacing'
	| 'surah-latin-text-style';

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
	| SurahNameStyleName;

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

		if (this.styles === undefined) return;

		// Load tout les styles composites (notamment pour le style sur le nom de la sourate)
		for (const [target, styles] of Object.entries(this.styles)) {
			for (const category of styles) {
				for (const style of category.styles) {
					if (style.valueType === 'composite') {
						this.loadCompositeStyles(style.id);
					}
				}
			}
		}
	}

	static async setDefaultStylesToDefaultOne(): Promise<VideoStyle> {
		const globalStyles: StylesData = await (await fetch('./styles/globalStyles.json')).json();
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
		const styles: StylesData = await (await fetch('./styles/styles.json')).json();

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
		// Les styles du target 'global' sont uniques et ne peuvent pas être individualisés
		if (target === 'global') {
			return;
		}
		for (const clipId of clipIds) {
			if (!this.overrides[clipId]) this.overrides[clipId] = {} as any;
			if (!this.overrides[clipId][target]) this.overrides[clipId][target] = {} as any;
			if (!this.overrides[clipId][target][categoryId])
				this.overrides[clipId][target][categoryId] = {} as any;

			this.overrides[clipId][target][categoryId]![styleId] = value;
		}
		this.lastUpdated = new Date();
	}

	// Supprime l'override pour un style donné sur une liste de clips
	clearStyleForClips(
		clipIds: number[],
		target: string,
		categoryId: StyleCategoryName,
		styleId: StyleName
	) {
		// Aucun override à supprimer pour 'global' (non supporté)
		if (target === 'global') {
			return;
		}
		for (const clipId of clipIds) {
			const byClip = this.overrides[clipId];
			if (!byClip) continue;
			const byTarget = byClip[target];
			if (!byTarget) continue;
			const byCategory = byTarget[categoryId];
			if (!byCategory) continue;

			if (byCategory[styleId] !== undefined) {
				delete byCategory[styleId];
			}

			// Nettoyage des objets vides
			if (Object.keys(byCategory).length === 0) {
				delete byTarget[categoryId];
			}
			if (Object.keys(byTarget).length === 0) {
				delete byClip[target];
			}
			if (Object.keys(byClip).length === 0) {
				delete this.overrides[clipId];
			}
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
		// Le target 'global' ignore toujours les overrides
		if (target === 'global') {
			return this.getStyle(target, categoryId, styleId).value;
		}
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
		// Jamais d'override pour 'global'
		if (target === 'global') return false;
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
	 * Indique si un clip possède au moins un override de style.
	 * Optionnellement, restreint par target et/ou catégorie.
	 * Le target 'global' est toujours ignoré.
	 */
	hasAnyOverrideForClip(clipId: number, target?: string, categoryId?: StyleCategoryName): boolean {
		const byClip = this.overrides?.[clipId];
		if (!byClip) return false;

		// Si un target est spécifié
		if (target) {
			// Ignorer explicitement 'global'
			if (target === 'global') return false;
			const byTarget = byClip[target];
			if (!byTarget) return false;

			// Si une catégorie est spécifiée
			if (categoryId) {
				const byCategory = byTarget[categoryId];
				return !!(byCategory && Object.keys(byCategory).length > 0);
			}

			// Sinon, vérifie toute catégorie de ce target
			return Object.values(byTarget).some((cat) => !!cat && Object.keys(cat as any).length > 0);
		}

		// Sans filtre, vérifie tous les targets et catégories (en excluant 'global')
		for (const t in byClip) {
			if (t === 'global') continue;
			const byTarget = byClip[t as keyof typeof byClip] as any;
			for (const c in byTarget) {
				const byCategory = byTarget[c];
				if (byCategory && Object.keys(byCategory).length > 0) return true;
			}
		}
		return false;
	}

	/**
	 * Get - et créer si nécessaire - les styles composites pour un style donné
	 * @param id L'identifiant du style
	 */
	getCompositeStyles(id: string): Style[] {
		// Try catch au cas où le style composite n'a toujours pas été créé

		try {
			return this.styles[id][0].styles;
		} catch (e: any) {
			return [];
		}
	}

	/**
	 * Créer les styles composites pour un style donné s'il n'existe pas déjà
	 * @param id L'identifiant du style
	 */
	async loadCompositeStyles(id: string) {
		if (!this.styles[id]) {
			this.styles[id] = [
				{
					id: id + '-category',
					styles: await this.getDefaultCompositeStyles(id),
					name: 'Composite Style For ' + id,
					description: 'This is a composite style for ' + id,
					icon: 'text_fields'
				}
			];
		}
	}

	getStyleFromComposite(compositeStyleId: string, styleId: StyleName): Style {
		const compositeStyles = this.getCompositeStyles(compositeStyleId);
		return compositeStyles.find((style) => style.id === styleId) || ({ value: 0 } as Style);
	}

	async getDefaultCompositeStyles(id?: string) {
		let styles: Style[] = await (await fetch('./styles/compositeStyles.json')).json();

		// Application des styles par défaut en fonction de l'ID
		if (id === 'surah-latin-text-style') {
			styles.find((style) => style.id === 'font-size')!.value = 8;
			// Enlève les deux styles vertical-position et horizontal-position
			styles = styles.filter(
				(style) => style.id !== 'vertical-position' && style.id !== 'horizontal-position'
			);
		}

		return styles;
	}

	/**
	 * Génère le CSS d'un style composite
	 * @param id L'id du style composite
	 * @param toIgnore La liste des styles à ignorer
	 * @returns Le CSS
	 */
	generateCSSForComposite(id: string) {
		// Récupère tous les styles composites pour un style donné
		const compositeStyles = this.getCompositeStyles(id);

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

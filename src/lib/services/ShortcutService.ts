/**
 * Interface représentant un raccourci clavier
 */
interface Shortcut {
	keys: string[]; // Modifié pour supporter plusieurs clés
	description: string;
	category: string;
	onKeyDown: (event: KeyboardEvent) => void;
	onKeyUp?: (event: KeyboardEvent) => void;
	preventDefault?: boolean;
}

/**
 * Service de gestion des raccourcis clavier
 * Fournit une interface propre pour enregistrer, gérer et exécuter des raccourcis clavier
 */
class ShortcutService {
	private static shortcuts = new Map<string, Shortcut>();
	private static keydownListener: ((event: KeyboardEvent) => void) | null = null;
	private static keyupListener: ((event: KeyboardEvent) => void) | null = null;
	private static isInitialized = false;

	/**
	 * Initialise le service de raccourcis
	 * Nettoie les anciens listeners et configure les nouveaux
	 */
	static init(): void {
		if (this.isInitialized) {
			this.cleanup();
		}

		this.keydownListener = this.handleKeyDown.bind(this);
		this.keyupListener = this.handleKeyUp.bind(this);

		document.addEventListener('keydown', this.keydownListener);
		document.addEventListener('keyup', this.keyupListener);

		this.isInitialized = true;
	}

	/**
	 * Nettoie les listeners d'événements
	 */
	static cleanup(): void {
		if (this.keydownListener) {
			document.removeEventListener('keydown', this.keydownListener);
			this.keydownListener = null;
		}
		if (this.keyupListener) {
			document.removeEventListener('keyup', this.keyupListener);
			this.keyupListener = null;
		}
		this.isInitialized = false;
	}
	/**
	 * Gère les événements keydown
	 */
	private static handleKeyDown(event: KeyboardEvent): void {
		const key = event.key.toLowerCase();
		const shortcut = this.shortcuts.get(key);

		if (shortcut) {
			if (shortcut.preventDefault !== false) {
				event.preventDefault();
			}
			console.log(`Shortcut triggered: ${shortcut.description} for key: ${key}`);
			shortcut.onKeyDown(event);
		}
	}

	/**
	 * Gère les événements keyup
	 */
	private static handleKeyUp(event: KeyboardEvent): void {
		const key = event.key.toLowerCase();
		const shortcut = this.shortcuts.get(key);

		if (shortcut?.onKeyUp) {
			if (shortcut.preventDefault !== false) {
				event.preventDefault();
			}
			shortcut.onKeyUp(event);
		}
	}
	/**
	 * Normalise les clés pour une comparaison cohérente
	 */
	private static normalizeKeys(keys: string | string[]): string[] {
		const keyArray = Array.isArray(keys) ? keys : [keys];
		return keyArray.map((key) => key.toLowerCase());
	}

	/**
	 * Enregistre un nouveau raccourci
	 */
	static registerShortcut(options: {
		key: string | string[]; // Accepte maintenant une clé ou un tableau de clés
		description: string;
		category: string;
		onKeyDown: (event: KeyboardEvent) => void;
		onKeyUp?: (event: KeyboardEvent) => void;
		preventDefault?: boolean;
	}): void {
		const normalizedKeys = this.normalizeKeys(options.key);

		const shortcut: Shortcut = {
			keys: normalizedKeys,
			description: options.description,
			category: options.category,
			onKeyDown: options.onKeyDown,
			onKeyUp: options.onKeyUp,
			preventDefault: options.preventDefault ?? true
		};

		// Enregistre le raccourci pour chaque clé
		normalizedKeys.forEach((key) => {
			this.shortcuts.set(key, shortcut);
		});
	}

	/**
	 * Supprime un raccourci
	 */
	static unregisterShortcut(key: string | string[]): boolean {
		const normalizedKeys = this.normalizeKeys(key);
		let hasDeleted = false;

		normalizedKeys.forEach((normalizedKey) => {
			if (this.shortcuts.delete(normalizedKey)) {
				hasDeleted = true;
			}
		});

		return hasDeleted;
	}
	/**
	 * Vérifie si un raccourci existe
	 */
	static hasShortcut(key: string): boolean {
		const normalizedKey = key.toLowerCase();
		return this.shortcuts.has(normalizedKey);
	}

	/**
	 * Obtient les informations d'un raccourci
	 */
	static getShortcut(key: string): Shortcut | undefined {
		const normalizedKey = key.toLowerCase();
		return this.shortcuts.get(normalizedKey);
	}
	/**
	 * Obtient tous les raccourcis d'une catégorie
	 */
	static getShortcutsByCategory(category: string): Shortcut[] {
		return Array.from(this.shortcuts.values()).filter((shortcut) => shortcut.category === category);
	}

	/**
	 * Obtient toutes les clés associées à un raccourci spécifique
	 */
	static getKeysForShortcut(key: string): string[] {
		const normalizedKey = key.toLowerCase();
		const shortcut = this.shortcuts.get(normalizedKey);
		return shortcut ? shortcut.keys : [];
	}

	/**
	 * Obtient tous les raccourcis enregistrés (dédupliqués)
	 */
	static getAllShortcuts(): Shortcut[] {
		const uniqueShortcuts = new Map<string, Shortcut>();

		// Déduplication basée sur la description + catégorie pour éviter les doublons
		// dus aux clés multiples
		for (const shortcut of this.shortcuts.values()) {
			const key = `${shortcut.category}:${shortcut.description}`;
			uniqueShortcuts.set(key, shortcut);
		}

		return Array.from(uniqueShortcuts.values());
	}

	/**
	 * Supprime tous les raccourcis
	 */
	static clearAllShortcuts(): void {
		this.shortcuts.clear();
	}
}

export default ShortcutService;

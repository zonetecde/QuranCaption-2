/**
 * Classe de base pour la sérialisation automatique des objets avec des propriétés $state de Svelte 5
 */
export class SerializableBase {
	// Métadonnées pour la désérialisation des objets enfants
	private static __childClasses = new Map<string, Map<string, any>>();

	/**
	 * Décore une propriété pour indiquer qu'elle doit être désérialisée avec une classe spécifique
	 */
	static registerChildClass(targetClass: any, propertyKey: string, childClass: any) {
		const className = targetClass.name;
		if (!this.__childClasses.has(className)) {
			this.__childClasses.set(className, new Map());
		}
		this.__childClasses.get(className)!.set(propertyKey, childClass);
	}

	/**
	 * Méthode toJSON personnalisée qui capture automatiquement toutes les propriétés,
	 * y compris les propriétés $state de Svelte 5
	 */
	toJSON(): any {
		const result: any = {};

		// Obtenir toutes les propriétés de l'instance actuelle
		const instance = this as any;

		// Parcourir toutes les propriétés énumérables de l'instance
		for (const key in instance) {
			if (instance.hasOwnProperty(key)) {
				const value = instance[key];

				// Exclure les fonctions
				if (typeof value !== 'function') {
					result[key] = value;
				}
			}
		}

		// Obtenir les propriétés du prototype (où Svelte place les accesseurs $state)
		let proto = Object.getPrototypeOf(instance);
		while (proto && proto !== Object.prototype) {
			const descriptors = Object.getOwnPropertyDescriptors(proto);

			for (const [key, descriptor] of Object.entries(descriptors)) {
				// Ignorer le constructeur et les méthodes
				if (key === 'constructor' || typeof descriptor.value === 'function') {
					continue;
				}

				// Si c'est un getter/setter (propriété $state de Svelte)
				if (descriptor.get && !result.hasOwnProperty(key)) {
					try {
						const value = descriptor.get.call(instance);
						if (value !== undefined && typeof value !== 'function') {
							result[key] = value;
						}
					} catch (error) {
						// Ignorer les erreurs d'accès aux propriétés
					}
				}
			}

			proto = Object.getPrototypeOf(proto);
		}

		return result;
	}

	/**
	 * Méthode utilitaire pour restaurer les propriétés depuis un objet plain
	 */
	static fromJSON<T extends SerializableBase>(this: new (...args: any[]) => T, data: any): T {
		// Créer une instance avec des paramètres par défaut pour éviter les erreurs du constructeur
		// mais permettre l'initialisation des champs privés $state
		const instance = new this() as any;

		// Obtenir les métadonnées des classes enfants pour cette classe
		const childClasses = (this as any).__childClasses?.get(this.name);

		// Parcourir toutes les propriétés du JSON
		for (const key in data) {
			if (Object.prototype.hasOwnProperty.call(data, key)) {
				const value = data[key];

				// Vérifier si cette propriété doit être désérialisée avec une classe spécifique
				if (childClasses && childClasses.has(key)) {
					const ChildClass = childClasses.get(key);

					if (Array.isArray(value)) {
						// Désérialiser un tableau d'objets
						instance[key] = value.map((item) => {
							if (item && typeof item === 'object' && ChildClass.fromJSON) {
								return ChildClass.fromJSON(item);
							} else if (typeof item === 'string' && SerializableBase.isDateString(item)) {
								return new Date(item);
							}
							return item;
						});
					} else if (value && typeof value === 'object' && ChildClass.fromJSON) {
						// Désérialiser un objet enfant
						instance[key] = ChildClass.fromJSON(value);
					} else if (typeof value === 'string' && SerializableBase.isDateString(value)) {
						// Convertir les dates dans les propriétés avec classe enfant
						instance[key] = new Date(value);
					} else {
						// Valeur primitive
						instance[key] = value;
					}

					console.log('AAAAA ', instance);
				} else {
					// Assigner directement la valeur (les propriétés $state seront automatiquement réactives)
					// Convertir les chaînes de date en objets Date
					if (typeof value === 'string' && SerializableBase.isDateString(value)) {
						instance[key] = new Date(value);
					} else {
						instance[key] = value;
					}
				}
			}
		}
		console.log(instance);

		return instance;
	}

	/**
	 * Clone l'objet en passant par la sérialisation/désérialisation
	 */
	clone<T extends SerializableBase>(this: T): T {
		const Constructor = this.constructor as new (...args: any[]) => T;
		const data = this.toJSON();
		return (Constructor as any).fromJSON(data);
	}

	/**
	 * Vérifie si une chaîne de caractères représente une date ISO valide
	 */
	private static isDateString(value: string): boolean {
		// Vérifier le format ISO 8601 (exemple: "2025-07-01T11:41:21.148Z")
		const isoDateRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z?$/;
		if (!isoDateRegex.test(value)) {
			return false;
		}

		// Vérifier que la date est valide
		const date = new Date(value);
		return !isNaN(date.getTime());
	}
}

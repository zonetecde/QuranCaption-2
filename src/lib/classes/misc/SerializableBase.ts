/**
 * Classe de base pour la sérialisation automatique des objets avec des propriétés $state de Svelte 5
 */
export class SerializableBase {
	// Nom de la classe pour la sérialisation - doit être défini dans chaque classe fille
	static __className: string = 'SerializableBase';

	// Métadonnées pour la désérialisation des objets enfants
	private static __childClasses = new Map<string, Map<string, any>>();

	// Registre global des classes pour la désérialisation automatique
	private static __classRegistry = new Map<string, any>();

	/**
	 * Enregistre une classe dans le registre global pour permettre la désérialisation automatique
	 */
	static registerClass(className: string, classConstructor: any) {
		this.__classRegistry.set(className, classConstructor);
		// Également définir le nom de classe statique
		classConstructor.__className = className;
	}

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
	 * y compris les propriétés $state de Svelte 5, et traite récursivement les objets imbriqués
	 */
	toJSON(): any {
		return SerializableBase.serializeObject(this);
	}

	/**
	 * Sérialise récursivement un objet, en ajoutant __className pour tous les objets SerializableBase
	 */
	private static serializeObject(obj: any): any {
		if (obj === null || obj === undefined) {
			return obj;
		}

		if (typeof obj !== 'object') {
			return obj;
		}

		if (Array.isArray(obj)) {
			return obj.map((item) => SerializableBase.serializeObject(item));
		}

		if (obj instanceof Date) {
			return obj.toISOString();
		}

		const result: any = {}; // Ajouter le nom de la classe si c'est un objet SerializableBase
		if (obj instanceof SerializableBase) {
			// Rechercher d'abord dans le registre en utilisant le constructeur de l'objet
			let className = null;

			// Parcourir le registre pour trouver la classe qui correspond exactement au constructeur
			for (const [registeredName, registeredClass] of SerializableBase.__classRegistry.entries()) {
				if (obj.constructor === registeredClass) {
					className = registeredName;
					break;
				}
			}

			// Si on n'a pas trouvé dans le registre, utiliser la propriété statique ou le nom du constructeur
			if (!className) {
				className = (obj.constructor as any).__className || obj.constructor.name;
			}

			result.__className = className;
		}

		// Obtenir toutes les propriétés de l'instance actuelle
		const instance = obj as any;

		// Parcourir toutes les propriétés énumérables de l'instance
		for (const key in instance) {
			if (instance.hasOwnProperty(key)) {
				const value = instance[key];

				// Exclure les fonctions
				if (typeof value !== 'function') {
					result[key] = SerializableBase.serializeObject(value);
				}
			}
		}

		// Obtenir les propriétés du prototype (où Svelte place les accesseurs $state) uniquement pour SerializableBase
		if (obj instanceof SerializableBase) {
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
								result[key] = SerializableBase.serializeObject(value);
							}
						} catch (error) {
							// Ignorer les erreurs d'accès aux propriétés
						}
					}
				}

				proto = Object.getPrototypeOf(proto);
			}
		}

		return result;
	}
	/**
	 * Méthode utilitaire pour restaurer les propriétés depuis un objet plain
	 */
	static fromJSON<T extends SerializableBase>(this: new (...args: any[]) => T, data: any): T {
		// Si l'objet contient un nom de classe, utiliser la classe appropriée
		const className = data.__className;
		let TargetClass = this;

		if (className && SerializableBase.__classRegistry.has(className)) {
			TargetClass = SerializableBase.__classRegistry.get(className);
		}

		// Créer une instance avec des paramètres par défaut pour éviter les erreurs du constructeur
		// mais permettre l'initialisation des champs privés $state
		const instance = new TargetClass() as any;

		// Obtenir les métadonnées des classes enfants pour cette classe
		const childClasses = SerializableBase.__childClasses?.get(TargetClass.name);

		// Parcourir toutes les propriétés du JSON
		for (const key in data) {
			if (Object.prototype.hasOwnProperty.call(data, key) && key !== '__className') {
				const value = data[key];

				// Vérifier si cette propriété doit être désérialisée avec une classe spécifique
				if (childClasses && childClasses.has(key)) {
					const ChildClass = childClasses.get(key);

					if (Array.isArray(value)) {
						// Désérialiser un tableau d'objets
						instance[key] = value.map((item) => {
							if (item && typeof item === 'object') {
								// Vérifier si l'item a un nom de classe pour désérialisation automatique
								if (item.__className && SerializableBase.__classRegistry.has(item.__className)) {
									const ItemClass = SerializableBase.__classRegistry.get(item.__className);
									return ItemClass.fromJSON(item);
								} else if (ChildClass.fromJSON) {
									return ChildClass.fromJSON(item);
								}
							} else if (typeof item === 'string' && SerializableBase.isDateString(item)) {
								return new Date(item);
							}
							return item;
						});
					} else if (value && typeof value === 'object') {
						// Vérifier si l'objet a un nom de classe pour désérialisation automatique
						if (value.__className && SerializableBase.__classRegistry.has(value.__className)) {
							const ItemClass = SerializableBase.__classRegistry.get(value.__className);
							instance[key] = ItemClass.fromJSON(value);
						} else if (ChildClass.fromJSON) {
							// Désérialiser un objet enfant
							instance[key] = ChildClass.fromJSON(value);
						} else {
							instance[key] = value;
						}
					} else if (typeof value === 'string' && SerializableBase.isDateString(value)) {
						// Convertir les dates dans les propriétés avec classe enfant
						instance[key] = new Date(value);
					} else {
						// Valeur primitive
						instance[key] = value;
					}
				} else {
					// Assigner directement la valeur, mais vérifier d'abord si c'est un objet sérialisé avec une classe
					if (value && typeof value === 'object' && !Array.isArray(value) && value.__className) {
						// Objet avec nom de classe - désérialisation automatique
						if (SerializableBase.__classRegistry.has(value.__className)) {
							const ItemClass = SerializableBase.__classRegistry.get(value.__className);
							instance[key] = ItemClass.fromJSON(value);
						} else {
							instance[key] = value;
						}
					} else if (Array.isArray(value)) {
						// Tableau - vérifier chaque élément pour désérialisation automatique
						instance[key] = value.map((item) => {
							if (
								item &&
								typeof item === 'object' &&
								item.__className &&
								SerializableBase.__classRegistry.has(item.__className)
							) {
								const ItemClass = SerializableBase.__classRegistry.get(item.__className);
								return ItemClass.fromJSON(item);
							} else if (typeof item === 'string' && SerializableBase.isDateString(item)) {
								return new Date(item);
							}
							return item;
						});
					} else if (typeof value === 'string' && SerializableBase.isDateString(value)) {
						// Convertir les chaînes de date en objets Date
						instance[key] = new Date(value);
					} else {
						// Valeur primitive ou non sérialisée
						instance[key] = value;
					}
				}
			}
		}

		return instance;
	}

	/**
	 * Méthode utilitaire pour désérialiser automatiquement n'importe quel objet
	 * sans avoir à spécifier la classe
	 */
	static deserialize(data: any): any {
		if (!data || typeof data !== 'object') {
			return data;
		}

		if (Array.isArray(data)) {
			return data.map((item) => SerializableBase.deserialize(item));
		}

		const className = data.__className;
		if (className && SerializableBase.__classRegistry.has(className)) {
			const TargetClass = SerializableBase.__classRegistry.get(className);
			return TargetClass.fromJSON(data);
		}

		// Si pas de nom de classe, on retourne l'objet tel quel
		return data;
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

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
	static fromJSON<T extends SerializableBase>(
		this: new (...args: any[]) => T,
		data: any,
		...constructorArgs: any[]
	): T {
		const instance = new this(...constructorArgs);
		const className = this.name;

		// Copier toutes les propriétés en traitant les dates
		for (const [key, value] of Object.entries(data)) {
			if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(value)) {
				// Reconvertir les dates
				(instance as any)[key] = new Date(value);
			} else {
				(instance as any)[key] = value;
			}
		}

		// Reconstituer les objets enfants enregistrés
		const childClasses = SerializableBase.__childClasses.get(className);
		if (childClasses) {
			for (const [propertyKey, ChildClass] of childClasses) {
				if (data[propertyKey] && typeof data[propertyKey] === 'object') {
					console.log(`Restoring child class for property: ${propertyKey} in ${className}`);
					if (ChildClass.fromJSON) {
						// Si la classe enfant a fromJSON, l'utiliser
						(instance as any)[propertyKey] = ChildClass.fromJSON(data[propertyKey]);
					} else {
						// Sinon, créer une nouvelle instance et assigner les propriétés
						(instance as any)[propertyKey] = Object.assign(new ChildClass(), data[propertyKey]);
					}
				}
			}
		}

		return instance;
	}

	/**
	 * Clone l'objet en passant par la sérialisation/désérialisation
	 */
	clone<T extends SerializableBase>(this: T, ...constructorArgs: any[]): T {
		const Constructor = this.constructor as new (...args: any[]) => T;
		const data = this.toJSON();
		return (Constructor as any).fromJSON(data, ...constructorArgs);
	}
}

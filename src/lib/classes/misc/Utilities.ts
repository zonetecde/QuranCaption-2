export class Utilities {
	private static lastId: number = 0;

	static randomId(): number {
		// Génère un ID basé sur timestamp + nombre aléatoire plus grand
		const timestamp = Date.now();
		const random = Math.floor(Math.random() * 1000); // 0-999
		let id = timestamp * 1000 + random;

		// S'assure que l'ID est toujours supérieur au précédent
		if (id <= this.lastId) {
			id = this.lastId + 1;
		}

		this.lastId = id;
		return id;
	}
}

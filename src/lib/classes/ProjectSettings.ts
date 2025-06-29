import { SerializableBase } from './misc/SerializableBase';

export class ProjectSettings extends SerializableBase {
	constructor() {
		super();
	}

	static getDefaultProjectSettings(): ProjectSettings {
		return new ProjectSettings();
	}
}

export class ProjectDetail {
	name: string;
	reciter: string;
	createdAt: Date;
	updatedAt: Date;

	constructor(name: string, reciter: string) {
		this.name = name;
		this.reciter = reciter;
		this.createdAt = new Date();
		this.updatedAt = new Date();
	}

	public updateTimestamp(): void {
		this.updatedAt = new Date();
	}
}

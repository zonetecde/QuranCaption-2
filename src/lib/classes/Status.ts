export class Status {
	static readonly EXPORTED = new Status('Exported', '#11ff00');
	static readonly TO_EXPORT = new Status('To Export', '#e600ff');
	static readonly TO_CAPTION = new Status('To Caption', '#ffea00');
	static readonly NOT_SET = new Status('Not Set', '#ffffff');
	static readonly TO_TRANSLATE = new Status('To Translate', '#ffea00');

	status: string;
	color: string;

	constructor(status: string, color: string) {
		this.status = status;
		this.color = color;
	}
}

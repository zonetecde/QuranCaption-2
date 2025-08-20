export class Edition {
	constructor(
		public key: string,
		public name: string,
		public author: string,
		public language: string,
		public direction: string,
		public source: string,
		public comments: string,
		public link: string,
		public linkmin: string,
		public showInTranslationsEditor: boolean = true
	) {}
}

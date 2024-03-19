export default interface Asset {
	fileName: string;
	filePath: string;
	type: 'audio' | 'video' | 'image' | 'unknown';
}

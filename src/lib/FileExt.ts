/**
 * Get the file name from a file path
 * @param path - The file path
 * @returns The file name
 */
export function getFileNameFromPath(path: string): string {
	path = path.replace(/\\/g, '/');
	return path.split('/').pop() || path;
}

/**
 * Get the type of file
 * @param filePath - The file path
 * @returns The file type
 */
export function getFileType(filePath: string): 'audio' | 'video' | 'image' | 'unknown' {
	const ext = filePath.split('.').pop() || '';
	if (AudioFileExt.includes(ext)) return 'audio';
	if (VideoFileExt.includes(ext)) return 'video';
	if (ImgFileExt.includes(ext)) return 'image';
	return 'unknown';
}

export const ImgFileExt = [
	'jpg',
	'jpeg',
	'png',
	'gif',
	'webp',
	'bmp',
	'tif',
	'tiff',
	'jfif',
	'jp2'
];

export const VideoFileExt = [
	'mp4',
	'mkv',
	'webm',
	'avi',
	'mov',
	'flv',
	'wmv',
	'3gp',
	'3g2',
	'mpg',
	'mpeg',
	'm4v',
	'f4v',
	'f4p',
	'f4a',
	'f4b',
	'ogv',
	'ogg',
	'drc',
	'gifv',
	'mng',
	'avi',
	'mov',
	'qt',
	'wmv',
	'yuv',
	'rm',
	'rmvb',
	'asf',
	'amv',
	'mp4',
	'm4p',
	'm4v',
	'mpg',
	'mp2',
	'mpeg',
	'mpe',
	'mpv',
	'mpg',
	'mpeg',
	'm2v',
	'm4v',
	'svi',
	'3gp',
	'3g2',
	'mxf',
	'roq',
	'nsv',
	'flv',
	'f4v',
	'f4p',
	'f4a',
	'f4b'
];

export const AudioFileExt = [
	'mp3',
	'wav',
	'ogg',
	'flac',
	'aac',
	'wma',
	'webm',
	'3gp',
	'3g2',
	'flv',
	'avi',
	'ogg',
	'ogv',
	'oga',
	'ogx',
	'ogm',
	'opus',
	'spx',
	'flac',
	'wav',
	'webm',
	'3gp',
	'3g2',
	'flv',
	'avi'
];

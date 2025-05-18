import { open } from '@tauri-apps/api/dialog';
import { invoke } from '@tauri-apps/api/tauri';

/**
 * Open a file dialog to select a file and read its content
 * @param fileName The name of the file to be displayed in the dialog
 * @param fileExtensions The extensions of the file to be displayed in the dialog
 * @returns
 */
export async function importAndReadFile(
	fileName: string,
	fileExtensions: string[] = ['qc2']
): Promise<string | null> {
	const selected = await open({
		multiple: false,
		filters: [
			{
				name: fileName,
				extensions: fileExtensions
			}
		]
	});

	if (!Array.isArray(selected) && selected !== null) {
		// Read the file's content
		const content: string = await invoke('get_file_content', {
			path: selected
		});

		return content;
	}

	return null;
}

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
	const ext = filePath.split('.').pop()?.toLocaleLowerCase() || '';
	if (AudioFileExt.includes(ext)) return 'audio';
	if (VideoFileExt.includes(ext)) return 'video';
	if (ImgFileExt.includes(ext)) return 'image';
	return 'unknown';
}

export function makeFileNameValid(fileName: string): string {
	// Replace characters not allowed in Windows file names: \ / : * ? " < > |
	fileName = fileName.replace(/[\\/:*?"<>|]/g, '_');
	// Remove leading and trailing spaces
	fileName = fileName.trim();
	// Remove trailing dots (Windows does not allow file names to end with a dot)
	fileName = fileName.replace(/\.+$/, '');
	return fileName;
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

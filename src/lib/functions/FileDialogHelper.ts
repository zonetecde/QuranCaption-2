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

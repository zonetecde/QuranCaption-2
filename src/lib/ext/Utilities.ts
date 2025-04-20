/**
 * Download a file with the given content and filename
 * @param content The content of the file to be downloaded
 * @param filename The name of the file to be downloaded
 */
export function downloadFile(content: string, filename: string) {
	const blob = new Blob([content], { type: 'application/json' });
	const url = URL.createObjectURL(blob);
	const a = document.createElement('a');
	a.href = url;
	a.download = filename;
	a.click();
	URL.revokeObjectURL(url);
}

/**
 * Telemetry function to send data to me
 * @param msg The message to be sent
 */
export async function telemetry(msg: String) {
	const url = 'https://rayanestaszewski.fr/telemetry?msg=';
	try {
		await fetch(url + msg, {
			method: 'POST'
		});
	} catch (error) {
		console.error('Failed to send telemetry data:', error);
	}
}

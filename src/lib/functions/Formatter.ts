export function millisecondsToSubtitlesTimeFormat(milliseconds: number) {
	const date = new Date(milliseconds);
	const hours = date.getUTCHours();
	const minutes = date.getUTCMinutes();
	const seconds = date.getUTCSeconds();
	const ms = date.getUTCMilliseconds();

	return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds
		.toString()
		.padStart(2, '0')},${ms.toString().padStart(3, '0')}`;
}

export function millisecondsToHHMMSS(milliseconds: number) {
	const date = new Date(milliseconds);
	const hours = date.getUTCHours();
	const minutes = date.getUTCMinutes();
	const seconds = date.getUTCSeconds();

	return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds
		.toString()
		.padStart(2, '0')}`;
}

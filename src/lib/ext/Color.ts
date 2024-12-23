export function generateBlueColor(uniqueId: string): string {
	const hash = uniqueId.split('').reduce((acc, char) => char.charCodeAt(0) + ((acc << 5) - acc), 0);

	const r = ((hash & 0x000000ff) % 40) + 83;
	const g = (((hash & 0x0000ff00) >> 8) % 40) + 140;
	const b = (((hash & 0x00ff0000) >> 16) % 40) + 150;

	return `rgb(${r}, ${g}, ${b})`;
}

export function generatePinkColor(uniqueId: string): string {
	const hash = uniqueId.split('').reduce((acc, char) => char.charCodeAt(0) + ((acc << 5) - acc), 0);

	const r = ((hash & 0x000000ff) % 40) + 200;
	const g = (((hash & 0x0000ff00) >> 8) % 40) + 83;
	const b = (((hash & 0x00ff0000) >> 16) % 40) + 140;

	return `rgb(${r}, ${g}, ${b})`;
}

export function generateRandomBrightColorBasedOnSeed(seed: String): string {
	const hash = seed.split('').reduce((acc, char) => char.charCodeAt(0) + ((acc << 5) - acc), 0);

	const r = ((hash & 0x000000ff) % 40) + 200;
	const g = (((hash & 0x0000ff00) >> 8) % 40) + 200;
	const b = (((hash & 0x00ff0000) >> 16) % 40) + 200;

	return `rgb(${r}, ${g}, ${b})`;
}

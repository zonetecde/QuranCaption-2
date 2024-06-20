export default interface Timeline {
	audiosTracks: Track[];
	videosTracks: Track[];
	subtitlesTracks: SubtitleTrack[];
}

export type Track = {
	id: string;
	name: string;
	type: 'Video track' | 'Audio track';
	clips: Clip[];
};

export type SubtitleTrack = {
	id: string;
	language: string;
	type: 'Subtitles track';
	name: string;
	clips: SubtitleClip[];
};

export type SubtitleClip = {
	id: string;
	start: number;
	end: number;
	text: string;
	surah: number;
	verse: number;
	isSilence: boolean;
	firstWordIndexInVerse: number;
	lastWordIndexInVerse: number;
	isLastWordInVerse: boolean;
	translations: { [key: string]: string };
};

export type Clip = {
	id: string;
	start: number;
	end: number;
	duration: number;
	assetId: string;
	fileStartTime: number;
	fileEndTime: number;
	isMuted: boolean;
};

/**
 * From seconds to HH:MM:SS, with the milliseconds in a separate string
 * @param seconds The seconds to convert
 * @param removeLeadingZero If true, removes the leading zero from the string
 * @returns A tuple with the first string being the HH:MM:SS and the second string being the milliseconds
 */
export function secondsToHHMMSS(
	seconds: number,
	removeLeadingZero: boolean = false
): [string, string] {
	if (seconds < 60) {
		let firstStr = (removeLeadingZero ? '' : '00:') + seconds.toFixed(0).padStart(2, '0');
		let secondStr = seconds.toFixed(2).split('.')[1];

		return [firstStr, secondStr];
	}

	const date = new Date(0);
	date.setSeconds(seconds);
	const hours = date.getUTCHours();
	const minutes = date.getUTCMinutes();
	const _seconds = date.getUTCSeconds();
	const milliseconds = seconds.toFixed(2).split('.')[1];
	let str = `${hours > 0 ? hours.toString().padStart(2, '0') + ':' : ''}${minutes.toString().padStart(2, '0')}:${_seconds.toString().padStart(2, '0')}`;

	if (removeLeadingZero) {
		str = str.replace(/^0+/, '');
	}

	return [str, milliseconds];
}

export function milisecondsToMMSS(milliseconds: number): string {
	const date = new Date(0);
	date.setMilliseconds(milliseconds);
	const minutes = date.getUTCMinutes();
	const seconds = date.getUTCSeconds();
	return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

export default interface Timeline {
	audiosTracks: Track[];
	videosTracks: Track[];
	subtitlesTracks: Track[];
}

export type Track = {
	id: string;
	name: string;
	type: 'Video track' | 'Audio track' | 'Subtitles track';
	clips: Clip[];
};

export type Clip = {
	id: string;
	start: number;
	end: number;
	duration: number;
	assetId: string;
	fileStartTime: number;
	fileEndTime: number;
};

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

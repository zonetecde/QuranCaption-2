import { SerializableBase } from './misc/SerializableBase';

export enum ExportState {
	WaitingForRecord = 'Waiting for Record',
	Recording = 'Recording',
	AddingAudio = 'Adding Audio',
	Exported = 'Exported',
	Error = 'Error',
	Canceled = 'Canceled',
	CreatingVideo = 'Creating Video',
	CapturingFrames = 'Capturing Frames',
	Initializing = 'Initializing...'
}

export default class Exportation extends SerializableBase {
	exportId: number;
	finalFileName: string;
	finalFilePath: string;
	videoDimensions: { width: number; height: number };
	videoLength: number;
	videoStartTime: number;
	videoEndTime: number;
	verseRange: string;
	currentState: ExportState;
	percentageProgress: number;
	currentTreatedTime: number;
	errorLog: string;

	constructor(
		exportId: number,
		finalFileName: string,
		finalFilePath: string,
		videoDimensions: { width: number; height: number },
		videoStartTime: number,
		videoEndTime: number,
		verseRange: string,
		currentState: ExportState,
		percentageProgress: number = 0,
		currentTreatedTime: number = 0,
		errorLog: string = ''
	) {
		super();
		this.exportId = exportId;
		this.finalFileName = finalFileName;
		this.finalFilePath = finalFilePath;
		this.videoDimensions = videoDimensions;
		this.videoStartTime = videoStartTime;
		this.videoEndTime = videoEndTime;
		this.videoLength = videoEndTime - videoStartTime;
		this.verseRange = verseRange;
		this.currentState = $state(currentState);
		this.percentageProgress = $state(percentageProgress);
		this.currentTreatedTime = $state(currentTreatedTime);
		this.errorLog = $state(errorLog);
	}

	isOnGoing() {
		return (
			this.currentState === ExportState.WaitingForRecord ||
			this.currentState === ExportState.Recording ||
			this.currentState === ExportState.AddingAudio ||
			this.currentState === ExportState.CreatingVideo ||
			this.currentState === ExportState.CapturingFrames ||
			this.currentState === ExportState.Initializing
		);
	}
}

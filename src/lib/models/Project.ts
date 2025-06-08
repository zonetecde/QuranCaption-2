import type ExportStatic from '$lib/components/export/ExportStatic.svelte';
import type Asset from './Asset';
import type Timeline from './Timeline';

export type ProjectStatus =
	| 'To caption'
	| 'Captioning'
	| 'To translate'
	| 'Translating'
	| 'To export'
	| 'Exported'
	| 'not set';
export const allStatus: ProjectStatus[] = [
	'To caption',
	'Captioning',
	'To translate',
	'Translating',
	'To export',
	'Exported',
	'not set'
];

export interface ProjectDesc {
	id: string;
	name: string;
	updatedAt: Date;
	createdAt: Date;
	percentageCaptioned: number;
	percentageTranslated: number;
	translations: string[];
	duration: number;
	status: ProjectStatus;
	description: string;
	reciter: string;
	versesRange: string[];
}

/**
 * Represents a project.
 */
export default interface Project {
	id: string;
	name: string;
	reciter: string;
	description: string;
	createdAt: Date;
	updatedAt: Date;
	timeline: Timeline;
	assets: Asset[];
	projectSettings: ProjectSettings;
}

/**
 * Represents the settings of a project.
 */
export interface ProjectSettings {
	cursorPosition: number;
	zoom: number;
	scrollLeft: number;
	globalSubtitlesSettings: GlobalVideoSettings;
	videoScale: number;
	translateVideoX: number;
	translateVideoY: number;
	bestPerformance: boolean;
	isPortrait: boolean;

	// Dictionnaire contenant les paramères de chaque track
	subtitlesTracksSettings: { [key: string]: SubtitleTrackSettings };
	addedTranslations: string[];
	individualSubtitlesSettings: { [key: string]: IndividualSubtitleSettings };

	exportSettings: ExportSettings;
}

export type ExportType = 'video-static' | 'video-obs' | 'sub' | 'ytb-chapters';

export interface ExportSettings {
	startTime: number;
	endTime: number | null;
	orientation: 'landscape' | 'portrait';
	exportType: ExportType;
	topRatio: number;
	middleRatio: number;
	bottomRatio: number;
	quality: number;
	fps: number;
	oneVideoPerAyah: boolean;
	forcePortrait: boolean;
}

/**
 * Represents the settings of the video
 */
export interface GlobalVideoSettings {
	background: boolean;
	backgroundColor: string;
	backgroundOpacity: number;
	fadeDuration: number;
	horizontalPadding: number;
	backgroundImage: string;
	creatorText: CreatorText;
	subscribeButton: SubscribeButton;
	globalGlowEffect: boolean;
	globalGlowColor: string;
	globalGlowRadius: number;
	surahNameSettings: SurahNameSettings;
}

/**
 * Represents the settings of the surah name.
 */
export interface SurahNameSettings {
	enable: boolean;
	size: number;
	verticalPosition: number;
	opacity: number;
	showLatin: boolean;
	latinTextBeforeSurahName: string;
}

/**
 * Represents the settings of the subscribe button.
 */
export interface SubscribeButton {
	enable: boolean;
	startTime: number;
	position: 'TL' | 'TR' | 'BL' | 'BR' | 'TC' | 'BC';
}

/**
 * Represents the settings of the creator text.
 */
export interface CreatorText {
	enable: boolean;
	text: string;
	fontFamily: string;
	fontSize: number;
	color: string;
	verticalPosition: number;
	opacity: number;
	outline: boolean;
}

/**
 * Represents the settings of a subtitle language.
 */
export interface SubtitleTrackSettings {
	enableSubtitles: boolean;
	fontSize: number;
	fontFamily: string;
	color: string;
	enableOutline: boolean;
	outlineThickness: number;
	outlineColor: string;
	verticalPosition: number;
	horizontalPadding: number;
	opacity: number;
	showVerseNumber: boolean;
	alignment: 'start' | 'center' | 'end' | 'justify';
	fitOnOneLine: boolean;
	neededHeightToFitFullScreen: number;
	neededHeightToFitSmallPreview: number;
	maxNumberOfLines: number;
	customTextSeparator: string;
}

/**
 * Represents the settings of an individual subtitle.
 */
export interface IndividualSubtitleSettings {
	glowEffect: boolean;
	glowColor: string;
	glowRadius: number;
	bold: boolean;
	underline: boolean;
	italic: boolean;
	hasAtLeastOneStyle: boolean;
}

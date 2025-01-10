import { get } from 'svelte/store';
import type Asset from './Asset';
import type Timeline from './Timeline';
import Id from '../ext/Id';
import { cursorPosition, zoom } from '../stores/TimelineStore';

export interface ProjectDesc {
	id: string;
	name: string;
	updatedAt: Date;
}

/**
 * Represents a project.
 */
export default interface Project {
	id: string;
	name: string;
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
	bestPerformance: boolean;

	// Dictionnaire contenant les paramères de chaque track
	subtitlesTracksSettings: { [key: string]: SubtitleTrackSettings };
	addedTranslations: string[];
	individualSubtitlesSettings: { [key: string]: IndividualSubtitleSettings };
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
}

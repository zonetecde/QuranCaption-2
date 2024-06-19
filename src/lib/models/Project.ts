import { get } from 'svelte/store';
import type Asset from '../classes/Asset';
import type Timeline from '../classes/Timeline';
import Id from '../ext/Id';
import { cursorPosition, zoom } from '../stores/TimelineStore';

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
	globalSubtitlesSettings: SubtitleSettings;
	// Dictionnaire contenant les paramères de chaque track
	subtitlesTracksSettings: { [key: string]: SubtitleTrackSettings };
	addedTranslations: string[];
}

/**
 * Represents the settings of subtitles.
 */
export interface SubtitleSettings {
	background: boolean;
	backgroundColor: string;
	backgroundOpacity: number;
	fadeDuration: number;
	horizontalPadding: number;

	creatorText: CreatorText;
}

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
 * Represents the settings of a track.
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
}

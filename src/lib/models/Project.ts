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
}

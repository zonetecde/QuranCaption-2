import type Project from '$lib/models/Project';
import { get, writable, type Writable } from 'svelte/store';
import { cursorPosition, zoom } from './TimelineStore';
import Id from '$lib/ext/Id';

export const currentProject: Writable<Project> = writable();

/**
 * Creates a blank project with the given name.
 * @param name - The name of the project.
 * @returns The created project.
 */
export function createBlankProject(name: string): Project {
	return {
		id: Id.generate(),
		name: name,
		createdAt: new Date(),
		updatedAt: new Date(),
		description: '',
		assets: [],
		timeline: {
			videosTracks: [
				{
					id: Id.generate(),
					name: 'Background Video',
					clips: [],
					type: 'Video track'
				}
			],
			audiosTracks: [
				{
					id: Id.generate(),
					name: 'Quran Recitation',
					clips: [],
					type: 'Audio track'
				}
			],
			subtitlesTracks: [
				{
					id: Id.generate(),
					name: 'Subtitles',
					clips: [],
					type: 'Subtitles track'
				}
			]
		},
		projectSettings: {
			cursorPosition: 0,
			zoom: 30
		}
	};
}

/**
 * Deletes a project by its ID.
 * @param id - The ID of the project to delete.
 * @returns An array of user projects.
 */
export function delProject(id: string): Project[] {
	const projects = getUserProjects();
	const index = projects.findIndex((p) => p.id === id);

	if (index !== -1) {
		console.log(projects.length);

		projects.splice(index, 1);
		localStorage.setItem('projects', JSON.stringify(projects));
	}

	return projects;
}

/**
 * Retrieves the user's projects from local storage.
 * @returns An array of user projects.
 */
export function getUserProjects(): Project[] {
	return JSON.parse(localStorage.getItem('projects') || '[]');
}

/**
 * Retrieves a project by its ID.
 * @param id - The ID of the project.
 * @returns The project with the specified ID, or undefined if not found.
 */
export function getProjectById(id: string): Project | undefined {
	return getUserProjects().find((p) => p.id === id);
}

/**
 * Updates the user's projects in local storage.
 * @param project - The project to update.
 */
export function updateUsersProjects(project: Project): void {
	if (project === undefined) return; // No project is open

	project.projectSettings.zoom = get(zoom);
	project.projectSettings.cursorPosition = get(cursorPosition);

	const projects = getUserProjects();

	const index = projects.findIndex((p) => p.id === project.id);
	if (index === -1) {
		projects.push(project);
	} else {
		projects[index] = project;
	}

	//localStorage.removeItem('projects');
	localStorage.setItem('projects', JSON.stringify(projects));
}

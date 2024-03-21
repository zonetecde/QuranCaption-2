import type Asset from './classes/Asset';
import type Timeline from './classes/Timeline';
import Id from './ext/Id';

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
}

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
			audiosTracks: [
				{
					id: Id.generate(),
					name: 'Quran',
					clips: []
				}
			],
			videosTracks: [
				{
					id: Id.generate(),
					name: 'Background Video',
					clips: []
				}
			],
			subtitlesTracks: [
				{
					id: Id.generate(),
					name: 'Subtitles',
					clips: []
				}
			]
		}
	};
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
	const projects = getUserProjects();

	const index = projects.findIndex((p) => p.id === project.id);
	if (index === -1) {
		projects.push(project);
	} else {
		projects[index] = project;
	}

	localStorage.setItem('projects', JSON.stringify(projects));
}

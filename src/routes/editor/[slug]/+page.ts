import type Project from '$lib/models/Project.js';
import { currentProject, getProjectById } from '$lib/stores/ProjectStore.js';
import { cursorPosition, zoom } from '$lib/stores/TimelineStore';
import { error } from '@sveltejs/kit';

export function load({ params }) {
	const slug = params.slug;

	const project = getProjectById(slug);

	if (!project) {
		return error(404, 'Project not found');
	}

	cursorPosition.set(project.projectSettings.cursorPosition);
	zoom.set(project.projectSettings.zoom);

	// Load the project into the store
	currentProject.set(project);
}

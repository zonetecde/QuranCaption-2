import type Project from '$lib/Project.js';
import { getProjectById, getUserProjects } from '$lib/Project.js';
import { currentProject } from '$lib/stores/ProjectStore.js';
import { error } from '@sveltejs/kit';

export function load({ params }) {
	const slug = params.slug;

	const project = getProjectById(slug);

	if (!project) {
		return error(404, 'Project not found');
	}

	// Load the project into the store
	currentProject.set(project);
}

import type Project from '$lib/Project.js';
import { error } from '@sveltejs/kit';

export function load({ params }) {
	const slug = params.slug;

	const userProjects = localStorage.getItem('projects');

	if (!userProjects) {
		return error(404, 'Project not found');
	}

	const projects = JSON.parse(userProjects);

	const project = projects.find((project: Project) => project.id === Number(slug));

	if (!project) {
		return error(404, 'Project not found');
	}

	return project;
}

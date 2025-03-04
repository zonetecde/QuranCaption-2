import type { ProjectDesc } from '$lib/models/Project';
import toast from 'svelte-french-toast';
import { importAndReadFile } from './Utilities';
import { backupAllProjects, getUserProjects, restoreAllProjects } from '$lib/stores/ProjectStore';
import type Project from '$lib/models/Project';

/**
 * From v2.8.0 to v2.9.0, the project system was changed.
 */
export async function newProjectSystemMigration() {
	const projects: any[] = JSON.parse(localStorage.getItem('projects') || '[]');
	if (projects.length > 0) {
		toast.success('We are migrating your projects to the new system. Please wait a moment.');

		// download all the user's project from localstorage
		let userProjects: Project[] = [];

		for (let i = 0; i < projects.length; i++) {
			const element = projects[i];

			userProjects.push(JSON.parse(localStorage.getItem(element.id)!));
		}

		const data = JSON.stringify(userProjects, null, 2);

		// download as file the data
		const blob = new Blob([data], { type: 'application/json' });
		const url = URL.createObjectURL(blob);

		const a = document.createElement('a');
		a.href = url;
		a.download = 'Backup in case something went wrong.qcb';
		a.click();

		if (data) {
			await restoreAllProjects(data);
		}

		localStorage.clear();
		// refresh the page
		location.reload();
	}
}

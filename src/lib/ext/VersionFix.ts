import type { ProjectDesc } from '$lib/models/Project';
import toast from 'svelte-french-toast';
import { importAndReadFile } from './Utilities';
import {
	backupAllProjects,
	doesProjectExist,
	getProjectById,
	getUserProjects,
	restoreAllProjects,
	updateUsersProjects
} from '$lib/stores/ProjectStore';
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

/**
 * This function will check if the user's project have the versesRange property.
 * If not, this means they did not have the migration from v3.4 to v3.5 - and v3.5 to v3.6. (for the createdAt property)
 * This will trigger a save of all the projects in the local storage; the save will add the versesRange property and others properties to the project
 * @param userProjectsDesc The user's projects
 * @returns true if the migration was done, false otherwise
 */
export async function addInformationsAboutProjectMigration(
	userProjectsDesc: ProjectDesc[],
	force: boolean = false // force la migration
): Promise<boolean> {
	if (userProjectsDesc.length > 0) {
		if (force || userProjectsDesc.some((project: ProjectDesc) => project.createdAt === undefined)) {
			toast('We are doing some updates on your projects, please wait a few seconds...', {
				duration: 5000,
				icon: '🔄'
			});

			let projects = await getUserProjects();
			for (const project of projects) {
				if (await doesProjectExist(project.id)) {
					const proj = await getProjectById(project.id);
					await updateUsersProjects(proj, true);
				}
			}

			toast.success('Your projects have been updated successfully!');

			return true;
		}
	}

	return false;
}

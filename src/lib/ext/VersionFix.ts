import type { ProjectDesc } from '$lib/models/Project';
import toast from 'svelte-french-toast';

/**
 * From v2.0.0 to v2.1.0, the project system was changed.
 */
export function newProjectSystemMigration() {
	const projects: any[] = JSON.parse(localStorage.getItem('projects') || '[]');
	if (projects.length > 0) {
		if (projects[0].timeline !== undefined) {
			// backup and download the old projects
			const data = JSON.stringify(projects, null, 2);
			const blob = new Blob([data], { type: 'application/json' });
			const url = URL.createObjectURL(blob);
			const a = document.createElement('a');
			a.href = url;
			a.download = 'BACKUP FILE IN CASE EVERYTHING BROKE.qcb';
			a.click();
			// Make each project occupy one different localstorage item
			let projectsDesc: ProjectDesc[] = [];
			for (let i = 0; i < projects.length; i++) {
				const element = projects[i];

				localStorage.setItem(element.id, JSON.stringify(element));
				projectsDesc.push({
					name: element.name,
					updatedAt: element.updatedAt,
					id: element.id
				});
			}

			localStorage.setItem('projects', JSON.stringify(projectsDesc));
			toast.success(
				'Do not panic if your projects are not here, try to restart the software. If they are still not here, click on the "Restore all projects" button and select the file that was downloaded.',
				{
					duration: 20000
				}
			);
		}
	}
}

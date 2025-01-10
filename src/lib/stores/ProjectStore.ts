import type Project from '$lib/models/Project';
import { get, writable, type Writable } from 'svelte/store';
import { cursorPosition, scrollPosition, zoom } from './TimelineStore';
import Id from '$lib/ext/Id';
import type { ProjectDesc } from '$lib/models/Project';
import { getSurahName } from './QuranStore';
import { millisecondsToHHMMSS } from '$lib/ext/Utilities';
import toast from 'svelte-french-toast';

export const currentProject: Writable<Project> = writable();

/**
 * Creates a blank project with the given name.
 * @param name - The name of the project.
 * @returns The created project.
 */
export function createBlankProject(name: string): Project {
	return {
		id: Id.generate(),
		name: name.trim(),
		createdAt: new Date(),
		updatedAt: new Date(),
		description: '',
		assets: [],
		timeline: {
			videosTracks: [
				{
					id: Id.generate(),
					name: 'Background Video',
					clips: [
						{
							id: 'black-video',
							start: 0,
							end: 7200000,
							duration: 7200000,
							assetId: 'black-video',
							fileStartTime: 0,
							fileEndTime: 7200000,
							isMuted: true
						}
					],
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
					type: 'Subtitles track',
					language: 'arabic'
				}
			]
		},
		projectSettings: {
			cursorPosition: 0,
			zoom: 30,
			scrollLeft: 0,
			addedTranslations: [],
			videoScale: 1,
			translateVideoX: 0,
			bestPerformance: false,
			individualSubtitlesSettings: {},
			globalSubtitlesSettings: {
				background: true,
				backgroundColor: '#000000',
				backgroundOpacity: 0.5,
				fadeDuration: 300,
				horizontalPadding: 0,
				backgroundImage: '',
				creatorText: {
					outline: true,
					enable: true,
					text: 'Quran Caption',
					fontFamily: 'Verdana',
					fontSize: 60,
					verticalPosition: 75,
					color: '#ffffff',
					opacity: 1
				}
			},
			subtitlesTracksSettings: {
				arabic: {
					enableSubtitles: true,
					fontSize: 100,
					fontFamily: 'Hafs',
					color: '#ffffff',
					enableOutline: true,
					outlineColor: '#000000',
					outlineThickness: 2,
					verticalPosition: 0,
					horizontalPadding: 0,
					opacity: 1,
					showVerseNumber: true,
					alignment: 'center'
				}
			}
		}
	};
}

/**
 * Deletes a project by its ID.
 * @param id - The ID of the project to delete.
 * @returns An array of user projects.
 */
export function delProject(id: string): ProjectDesc[] {
	localStorage.removeItem(id);

	let userProjects = getUserProjects();
	userProjects = userProjects.filter((x) => x.id !== id);
	localStorage.setItem('projects', JSON.stringify(userProjects));

	return userProjects;
}

/**
 * Retrieves the user's projects from local storage.
 * @returns An array of user projects.
 */
export function getUserProjects(): ProjectDesc[] {
	return JSON.parse(localStorage.getItem('projects') || '[]');
}

/**
 * Retrieves the user's projects from local storage as projects.
 * @returns An array of user projects.
 */
export function getUserProjectsAsProjects(): Project[] {
	const projects = getUserProjects();
	const result: Project[] = [];

	for (const project of projects) {
		const projJson = localStorage.getItem(project.id);
		if (projJson) {
			result.push(JSON.parse(projJson));
		}
	}

	return result;
}

/**
 * Retrieves a project by its ID.
 * @param id - The ID of the project.
 * @returns The project with the specified ID, or undefined if not found.
 */
export function getProjectById(id: string): Project | undefined {
	const projJson = localStorage.getItem(id);
	if (projJson) return JSON.parse(projJson);
	else return createBlankProject('undefined project');
}

/**
 * Updates the user's projects in local storage.
 * @param project - The project to update.
 */
export function updateUsersProjects(project: Project): ProjectDesc[] {
	const projects: ProjectDesc[] = getUserProjects();

	if (project === undefined) return projects; // No project is open

	project.projectSettings.zoom = get(zoom);
	project.projectSettings.cursorPosition = get(cursorPosition);
	project.projectSettings.scrollLeft = get(scrollPosition);

	const index = projects.findIndex((p) => p.id === project.id);
	if (index === -1) {
		if (projects.find((p) => p.name === project.name)) {
			project.name = project.name + ' - New';
		}

		projects.push({
			id: project.id,
			name: project.name,
			updatedAt: project.updatedAt
		});
	} else {
		projects[index] = {
			id: project.id,
			name: project.name,
			updatedAt: project.updatedAt
		};
	}

	localStorage.setItem(project.id, JSON.stringify(project));
	localStorage.setItem('projects', JSON.stringify(projects));

	return projects;
}

export function downloadYoutubeChapters() {
	const _currentProject = get(currentProject);

	// first chapter should be 00:00:00, first surah name in the projet
	// then the rest of the chapters should be the surah names
	const chapters: {
		start: string;
		end: string;
		title: string;
	}[] = [];

	let lastChapterName = '';
	let i = 0;
	_currentProject.timeline.subtitlesTracks[0].clips.forEach((clip) => {
		if (clip.surah >= 1 && clip.surah <= 114) {
			const surahName = getSurahName(clip.surah);
			if (surahName !== lastChapterName) {
				chapters.push({
					start: millisecondsToHHMMSS(clip.start),
					end: _currentProject.timeline.subtitlesTracks[0].clips[i - 1]
						? millisecondsToHHMMSS(_currentProject.timeline.subtitlesTracks[0].clips[i - 1].end)
						: '00:00:00',
					title: surahName
				});
				lastChapterName = surahName;
			}
		}

		i++;
	});

	// first chapter should start at 00:00:00 even if there's a silence or basmallah
	if (chapters.length > 0) chapters[0].start = '00:00:00';

	// download as text :
	// 00:00:00 - Al-Fatihah
	// ...
	const a = document.createElement('a');
	const file = new Blob([chapters.map((c) => `${c.start} - ${c.title}`).join('\n')], {
		type: 'text/plain'
	});
	a.href = URL.createObjectURL(file);
	a.download = 'youtube chapters for ' + _currentProject.name + '.txt';
	a.click();
	URL.revokeObjectURL(a.href);
}
